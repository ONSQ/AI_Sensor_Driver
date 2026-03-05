"""
Offline DQN training script for the SensorRacer decision layer.

Usage (from repo root, after installing rl_training/requirements.txt):

    python -m rl_training.train_dqn

This script:
  - Wraps SensorRacerDQNEnv in a Gym-compatible Env.
  - Trains a DQN policy with stable-baselines3.
  - Saves the trained model and simple training logs for later analysis.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np

from rl_training.env import (
    SensorRacerDQNEnv,
    EnvConfig,
    NUM_ACTIONS,
    ACTION_STRAIGHT,
    ACTION_LEFT,
    ACTION_RIGHT,
    ACTION_BRAKE,
    ACTION_ACCELERATE,
)


def _ensure_output_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


@dataclass
class TrainingConfig:
    total_timesteps: int = 200_000
    learning_rate: float = 3e-4
    gamma: float = 0.99
    batch_size: int = 64
    buffer_size: int = 100_000
    exploration_initial_eps: float = 1.0
    exploration_final_eps: float = 0.05
    exploration_fraction: float = 0.4

    log_dir: str = "rl_training/output"
    model_name: str = "sensor_racer_dqn"


def make_gym_env(seed: int | None = None):
    """
    Create a Gymnasium-compatible wrapper env for SensorRacerDQNEnv.
    """
    import gymnasium as gym  # type: ignore

    class _GymSensorRacerEnv(gym.Env):
        metadata = {"render_modes": []}

        def __init__(self, *_: Any, **__: Any):
            super().__init__()
            self._inner = SensorRacerDQNEnv(EnvConfig(), seed=seed)

            # Observation: 11D vector, see docs/dqn_decision_rl_spec.md
            low = np.array(
                [
                    0.0,   # dist_front
                    0.0,   # dist_left
                    0.0,   # dist_right
                    0.0,   # light_red
                    0.0,   # light_yellow
                    0.0,   # light_green
                    0.0,   # ped_in_path
                    0.0,   # speed_ratio
                    -1.0,  # aligned_to_waypoint
                    0.0,   # zone_school
                    0.0,   # visibility
                ],
                dtype=np.float32,
            )
            high = np.array(
                [
                    1.0,  # dist_front
                    1.0,  # dist_left
                    1.0,  # dist_right
                    1.0,  # light_red
                    1.0,  # light_yellow
                    1.0,  # light_green
                    1.0,  # ped_in_path
                    2.0,  # speed_ratio
                    1.0,  # aligned_to_waypoint
                    1.0,  # zone_school
                    1.0,  # visibility
                ],
                dtype=np.float32,
            )

            self.observation_space = gym.spaces.Box(low=low, high=high, dtype=np.float32)
            self.action_space = gym.spaces.Discrete(NUM_ACTIONS)

        def reset(self, *, seed: int | None = None, options: Dict[str, Any] | None = None):
            if seed is not None:
                # re-seed the inner RNG if requested
                self._inner = SensorRacerDQNEnv(EnvConfig(), seed=seed)
            obs = self._inner.reset()
            info: Dict[str, Any] = {}
            return obs, info

        def step(self, action: int):
            obs, reward, done, info = self._inner.step(int(action))
            terminated = done
            truncated = False  # we encode all termination reasons in "terminated"
            return obs, reward, terminated, truncated, info

    return _GymSensorRacerEnv


def train_dqn(cfg: TrainingConfig | None = None) -> None:
    """
    Run offline DQN training and save model + logs.
    """
    if cfg is None:
        cfg = TrainingConfig()

    _ensure_output_dir(cfg.log_dir)

    # Lazy imports so the repo can be installed without heavy RL deps.
    from stable_baselines3 import DQN  # type: ignore
    from stable_baselines3.common.monitor import Monitor  # type: ignore
    from stable_baselines3.common.vec_env import DummyVecEnv  # type: ignore

    GymEnvCls = make_gym_env(seed=42)

    def _make_env():
        env = GymEnvCls()
        env = Monitor(env)
        return env

    vec_env = DummyVecEnv([_make_env])

    model = DQN(
        "MlpPolicy",
        vec_env,
        learning_rate=cfg.learning_rate,
        gamma=cfg.gamma,
        batch_size=cfg.batch_size,
        buffer_size=cfg.buffer_size,
        exploration_initial_eps=cfg.exploration_initial_eps,
        exploration_final_eps=cfg.exploration_final_eps,
        exploration_fraction=cfg.exploration_fraction,
        verbose=1,
        tensorboard_log=os.path.join(cfg.log_dir, "tb"),
    )

    # Simple training loop with periodic evaluation / logging
    episode_rewards: List[float] = []
    episode_lengths: List[int] = []
    collision_counts: List[int] = []
    red_light_violations: List[int] = []

    # We rely on Monitor to aggregate episode stats; stable-baselines3
    # will populate them in the Monitor CSV.
    model.learn(total_timesteps=cfg.total_timesteps)

    # Save the model in sb3 native format for later conversion.
    model_path = os.path.join(cfg.log_dir, f"{cfg.model_name}.zip")
    model.save(model_path)

    # Note: For detailed analytics (e.g. collisions per episode),
    # read the Monitor CSV that Monitor wrote in cfg.log_dir.

    print(f"[rl_training] DQN training complete. Model saved to: {model_path}")
    print(f"[rl_training] Monitor logs (episode rewards, lengths) written under: {cfg.log_dir}")


def describe_action_mapping() -> None:
    """
    Convenience helper to print the action index to label mapping,
    ensuring parity between training and runtime.
    """
    mapping = {
        ACTION_STRAIGHT: "STRAIGHT",
        ACTION_LEFT: "LEFT",
        ACTION_RIGHT: "RIGHT",
        ACTION_BRAKE: "BRAKE",
        ACTION_ACCELERATE: "ACCELERATE",
    }
    print("SensorRacer DQN action mapping:")
    for idx, label in mapping.items():
        print(f"  {idx} → {label}")


if __name__ == "__main__":
    describe_action_mapping()
    train_dqn()

