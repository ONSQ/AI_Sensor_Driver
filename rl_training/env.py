"""
Simplified Gym-like environment for training a DQN
for the SensorRacer decision layer.

The environment mirrors the RL specification in
`docs/dqn_decision_rl_spec.md` but uses a 1D track
with abstracted events (obstacles, traffic lights,
school zones, pedestrians) for fast offline training.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple, Dict, Any

import numpy as np

try:
    import gymnasium as gym  # type: ignore
except ImportError:  # pragma: no cover - training env dependency
    gym = None  # Fallback so the module can still be imported without gym installed


# Action index mapping (must match docs and runtime)
ACTION_STRAIGHT = 0
ACTION_LEFT = 1
ACTION_RIGHT = 2
ACTION_BRAKE = 3
ACTION_ACCELERATE = 4

NUM_ACTIONS = 5


@dataclass
class EnvConfig:
    """
    Configuration for the simplified driving environment.
    Values chosen to roughly approximate the full game but
    small enough for fast RL training.
    """

    track_length: float = 500.0  # meters
    max_steps: int = 500
    dt: float = 0.2  # seconds per step

    # Speed limits (m/s)
    base_speed_limit: float = 13.0  # ~30 mph
    school_zone_speed_limit: float = 8.0  # slower

    # Physics-ish parameters
    accel_per_step: float = 1.5
    brake_per_step: float = 2.0
    max_speed: float = 25.0

    # Distances
    max_sensor_distance: float = 60.0

    # Reward weights (see docs/dqn_decision_rl_spec.md)
    reward_ped_hit: float = -2.0
    reward_collision: float = -1.5
    reward_red_light: float = -1.0
    reward_waypoint: float = 0.5
    reward_emergency_yield: float = 0.2
    reward_safe_step: float = 0.1
    reward_time_penalty: float = -0.01
    reward_heavy_speeding: float = -0.1
    # Additional shaping
    reward_progress_scale: float = 0.001  # per meter of forward progress
    reward_idle_brake_penalty: float = -0.05  # braking with no clear threat


class SensorRacerDQNEnv:
    """
    Minimal Gym-like environment used for offline DQN training.

    State vector layout (length 11), matching docs/dqn_decision_rl_spec.md:

        [dist_front,
         dist_left,
         dist_right,
         light_red,
         light_yellow,
         light_green,
         ped_in_path,
         speed_ratio,
         aligned_to_waypoint,
         zone_school,
         visibility]
    """

    def __init__(self, config: EnvConfig | None = None, seed: int | None = None):
        if config is None:
            config = EnvConfig()
        self.config = config
        self.rng = np.random.default_rng(seed)

        self._step_count: int = 0

        # Continuous 1D position along track and lateral lane index (-1, 0, +1)
        self.position: float = 0.0
        self.lane: int = 0
        self.speed: float = 0.0

        # Environment events
        self._waypoint_positions: np.ndarray | None = None
        self._obstacle_positions: np.ndarray | None = None
        self._ped_positions: np.ndarray | None = None
        self._school_zone_start: float = 0.0
        self._school_zone_end: float = 0.0
        self._traffic_light_pos: float = 0.0
        self._traffic_light_state: str = "green"  # "green" | "yellow" | "red"
        self._emergency_event_pos: float = 0.0

        self._visibility: float = 1.0
        # Waypoints we have already given reward for this episode (indices)
        self._waypoints_reached: set[int] = set()

    # --- Public API (Gym-like) -------------------------------------------------

    def reset(self) -> np.ndarray:
        """
        Reset world to a randomized configuration and return initial state.
        """
        cfg = self.config
        self._step_count = 0
        self.position = 0.0
        self.lane = 0
        self.speed = self.rng.uniform(0.0, cfg.base_speed_limit * 0.5)

        # Reset per-episode waypoint tracking so each waypoint is rewarded at most once
        self._waypoints_reached = set()

        # Randomize world elements along the 1D track
        num_waypoints = 4
        self._waypoint_positions = np.linspace(
            cfg.track_length / (num_waypoints + 1),
            cfg.track_length - cfg.track_length / (num_waypoints + 1),
            num_waypoints,
        )
        # Obstacles near some waypoints
        self._obstacle_positions = self._waypoint_positions + self.rng.normal(0.0, 10.0, size=num_waypoints)

        # One pedestrian crossing somewhere in the middle half of the track
        self._ped_positions = np.array(
            [self.rng.uniform(cfg.track_length * 0.25, cfg.track_length * 0.75)]
        )

        # School zone occupying a random segment
        sz_center = self.rng.uniform(cfg.track_length * 0.3, cfg.track_length * 0.7)
        sz_half_width = cfg.track_length * 0.1
        self._school_zone_start = max(0.0, sz_center - sz_half_width)
        self._school_zone_end = min(cfg.track_length, sz_center + sz_half_width)

        # Single traffic light near the last waypoint
        self._traffic_light_pos = self._waypoint_positions[-1] + 10.0
        self._traffic_light_state = self.rng.choice(["green", "yellow", "red"])

        # Emergency event somewhere after mid-track
        self._emergency_event_pos = self.rng.uniform(cfg.track_length * 0.4, cfg.track_length * 0.9)

        # Visibility drawn from a discrete set for interpretability
        self._visibility = float(
            self.rng.choice(
                [1.0, 0.7, 0.4],  # clear, dusk, low visibility
                p=[0.5, 0.3, 0.2],
            )
        )

        return self._build_state()

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        """
        Apply an action and step the simulation forward.
        Returns: (next_state, reward, done, info).
        """
        cfg = self.config
        self._step_count += 1

        # --- 1. Update kinematics based on action ---
        prev_position = self.position
        if action == ACTION_ACCELERATE:
            self.speed += cfg.accel_per_step
        elif action == ACTION_BRAKE:
            self.speed -= cfg.brake_per_step
        elif action in (ACTION_LEFT, ACTION_RIGHT):
            # Simple lane change abstraction: left / right nudge
            self.lane += -1 if action == ACTION_LEFT else 1
            self.lane = int(np.clip(self.lane, -1, 1))
        else:
            # STRAIGHT: no change in speed, lane stays constant
            pass

        # Clamp speed
        self.speed = float(np.clip(self.speed, 0.0, cfg.max_speed))

        # Move along the track
        self.position += self.speed * cfg.dt

        # --- 2. Compute events and reward ---
        reward = 0.0
        done = False
        info: Dict[str, Any] = {}

        # Determine zone and speed limit
        in_school_zone = self._school_zone_start <= self.position <= self._school_zone_end
        speed_limit = cfg.school_zone_speed_limit if in_school_zone else cfg.base_speed_limit
        speed_ratio = self.speed / max(speed_limit, 1e-3)

        # Collision flags (simplified; only longitudinal position matters here)
        ped_hit = bool(
            np.any(np.abs(self._ped_positions - self.position) < 1.0)
        )
        obstacle_hit = bool(
            np.any(np.abs(self._obstacle_positions - self.position) < 2.0)
        )

        # Traffic light violation: passing the light while it is red
        passed_light = self.position >= self._traffic_light_pos
        ran_red = passed_light and self._traffic_light_state == "red"

        # Waypoint reward: only when crossing a waypoint from not-reached to reached.
        # Track which waypoints have already been rewarded to avoid rewarding hover/linger.
        waypoint_reward_count = 0
        for i, wp_pos in enumerate(self._waypoint_positions):
            if i in self._waypoints_reached:
                continue
            # Crossed this waypoint this step (forward motion: prev_position < wp <= position)
            if prev_position < wp_pos <= self.position:
                self._waypoints_reached.add(i)
                waypoint_reward_count += 1

        # Emergency yield: if near emergency event position and going slow enough
        near_emergency = abs(self.position - self._emergency_event_pos) < 10.0
        emergency_yield = near_emergency and self.speed < (0.5 * speed_limit)

        # --- Reward components ---
        if ped_hit:
            reward += cfg.reward_ped_hit
            done = True
            info["terminal_reason"] = "ped_hit"

        if obstacle_hit and not done:
            reward += cfg.reward_collision
            done = True
            info["terminal_reason"] = "obstacle_hit"

        if ran_red:
            reward += cfg.reward_red_light

        reward += waypoint_reward_count * cfg.reward_waypoint

        if emergency_yield:
            reward += cfg.reward_emergency_yield

        # Safe driving bonus: only if no serious violation this step
        safe_now = not (ped_hit or obstacle_hit or ran_red)
        if safe_now:
            reward += cfg.reward_safe_step

        # Forward progress reward (only when moving forward)
        delta_pos = max(0.0, self.position - prev_position)
        if safe_now and delta_pos > 0.0:
            reward += cfg.reward_progress_scale * delta_pos

        # Lightly penalize unnecessary braking when there is no obvious threat
        # (no close obstacle, no nearby pedestrian, no traffic control ahead).
        dist_next_obstacle = self._distance_to_next(self._obstacle_positions, ahead_only=True)
        dist_next_ped = self._distance_to_next(self._ped_positions, ahead_only=True)
        no_threat = (
            not ped_hit
            and not obstacle_hit
            and not ran_red
            and not near_emergency
            and dist_next_obstacle > 30.0
            and dist_next_ped > 15.0
        )
        if action == ACTION_BRAKE and no_threat and self.speed < (0.5 * speed_limit):
            reward += cfg.reward_idle_brake_penalty

        # Time and speeding penalties
        reward += cfg.reward_time_penalty
        if speed_ratio > 1.2:
            reward += cfg.reward_heavy_speeding

        # Episode termination by reaching goal or track end
        if self.position >= cfg.track_length and not done:
            done = True
            info["terminal_reason"] = "goal_reached"

        # Episode termination by horizon
        if self._step_count >= cfg.max_steps and not done:
            done = True
            info["terminal_reason"] = "max_steps"

        # Build next state
        next_state = self._build_state()

        # Add some diagnostics for logging/analysis
        info.update(
            {
                "position": float(self.position),
                "speed": float(self.speed),
                "lane": int(self.lane),
                "speed_limit": float(speed_limit),
                "in_school_zone": bool(in_school_zone),
                "speed_ratio": float(speed_ratio),
            }
        )

        return next_state, float(reward), bool(done), info

    # --- Internal helpers ------------------------------------------------------

    def _build_state(self) -> np.ndarray:
        """
        Construct the 11D state vector from the current env state.
        """
        cfg = self.config

        # Distances to nearest front/side obstacles along track (simplified)
        dist_front = self._distance_to_next(self._obstacle_positions, ahead_only=True)
        dist_left = dist_front  # simplified, track is effectively 1D
        dist_right = dist_front

        def _norm_dist(d: float) -> float:
            if d < 0.0:
                return 0.0
            if d > cfg.max_sensor_distance:
                return 1.0
            return d / cfg.max_sensor_distance

        nf = _norm_dist(dist_front)
        nl = _norm_dist(dist_left)
        nr = _norm_dist(dist_right)

        # Traffic light one-hot, only if within sensor range
        light_red = 0.0
        light_yellow = 0.0
        light_green = 0.0
        dist_to_light = self._traffic_light_pos - self.position
        if 0.0 <= dist_to_light <= cfg.max_sensor_distance:
            if self._traffic_light_state == "red":
                light_red = 1.0
            elif self._traffic_light_state == "yellow":
                light_yellow = 1.0
            elif self._traffic_light_state == "green":
                light_green = 1.0

        # Pedestrian in path if one is within a short forward window
        ped_in_path = 0.0
        if self._distance_to_next(self._ped_positions, ahead_only=True) < 10.0:
            ped_in_path = 1.0

        # Speed ratio vs current speed limit
        in_school_zone = self._school_zone_start <= self.position <= self._school_zone_end
        speed_limit = self.config.school_zone_speed_limit if in_school_zone else self.config.base_speed_limit
        speed_ratio = self.speed / max(speed_limit, 1e-3)
        speed_ratio = float(np.clip(speed_ratio, 0.0, 2.0))

        # Waypoint alignment (very coarse: left/straight/right based on remaining distance)
        # In this 1D abstraction we use a simple heuristic:
        # - if near the final part of track, assume straight
        # - else alternate segments that "want" LEFT or RIGHT for variety
        segment = int((self.position / max(self.config.track_length, 1e-3)) * 4)
        if segment <= 0 or segment >= 3:
            aligned_to_waypoint = 0.0
        elif segment == 1:
            aligned_to_waypoint = -1.0
        else:
            aligned_to_waypoint = 1.0

        zone_school = 1.0 if in_school_zone else 0.0
        visibility = float(np.clip(self._visibility, 0.0, 1.0))

        state = np.array(
            [
                nf,
                nl,
                nr,
                light_red,
                light_yellow,
                light_green,
                ped_in_path,
                speed_ratio,
                aligned_to_waypoint,
                zone_school,
                visibility,
            ],
            dtype=np.float32,
        )

        return state

    def _distance_to_next(self, positions: np.ndarray | None, ahead_only: bool = True) -> float:
        """
        Distance to next element in a 1D list of positions.
        Returns +inf if none ahead (or at all).
        """
        if positions is None or len(positions) == 0:
            return float("inf")

        diffs = positions - self.position
        if ahead_only:
            diffs = diffs[diffs >= 0.0]
        if diffs.size == 0:
            return float("inf")

        return float(np.min(diffs))

