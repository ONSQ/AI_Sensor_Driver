## DQN Decision Layer RL Specification

This document defines the reinforcement learning (RL) formulation for the pre‑trained DQN that will replace the current utility‑based `DecisionEngine` in the AI decision layer. It ensures that the **offline training environment** and the **runtime TF.js model** share a consistent definition of state, actions, rewards, and episode termination.

---

### 1. State Vector Definition

The DQN operates on a **fixed‑length, low‑dimensional feature vector** derived from the game’s high‑level `worldState` (and, where needed, fused sensor/perception outputs). All values must be normalized consistently between training and runtime.

Let the state vector be:

1. **Front obstacle distance**
   - Name: `dist_front`
   - Source: distance to nearest obstacle directly ahead in the ego lane.
   - Normalization:  
     \[
     \text{dist\_front} = \mathrm{clip}\left(\frac{d_{\text{front}}}{D_{\text{max}}}, 0, 1\right)
     \]
     where \(D_{\text{max}}\) is a configurable cap (e.g. 60 m). If no obstacle within \(D_{\text{max}}\), use 1.0.

2. **Left obstacle distance**
   - Name: `dist_left`
   - Source: distance to nearest relevant obstacle for a leftward maneuver (e.g. in adjacent lane or turn path).
   - Normalization: same as `dist_front`.

3. **Right obstacle distance**
   - Name: `dist_right`
   - Source: distance to nearest relevant obstacle for a rightward maneuver.
   - Normalization: same as `dist_front`.

4. **Traffic light one‑hot**
   - Names: `light_red`, `light_yellow`, `light_green`
   - Source: state of the next traffic light on the current path.
   - Encoding:
     - If there is an upcoming light within a configured distance window (e.g. 50 m), set exactly one of:
       - `light_red = 1`, `light_yellow = 0`, `light_green = 0`, or
       - `light_red = 0`, `light_yellow = 1`, `light_green = 0`, or
       - `light_red = 0`, `light_yellow = 0`, `light_green = 1`.
     - If no relevant light: `light_red = light_yellow = light_green = 0`.

5. **Pedestrian / vulnerable road user in path**
   - Name: `ped_in_path`
   - Source: whether a pedestrian/child/animal is detected in a danger cone ahead.
   - Encoding: binary flag in \{0,1\}.

6. **Speed relative to limit**
   - Name: `speed_ratio`
   - Source: ego speed and local speed limit.
   - Normalization:
     \[
     \text{speed\_ratio} = \mathrm{clip}\left(\frac{v}{v_{\text{limit}}}, 0, 2\right)
     \]
     where values > 1 indicate speeding, capped at 2.

7. **Alignment to next waypoint**
   - Name: `aligned_to_waypoint`
   - Source: direction of the next navigation waypoint relative to vehicle heading.
   - Encoding (scalar):
     - `-1` = turn left is required
     - `0` = continue straight
     - `+1` = turn right is required
   - Normalization: keep as is in \[-1, 1\].

8. **School‑zone context**
   - Name: `zone_school`
   - Source: whether ego vehicle is currently in a school zone segment.
   - Encoding: binary flag in \{0,1\}.

9. **Visibility**
   - Name: `visibility`
   - Source: fused notion of current visual conditions (daylight, dusk, night, fog, rain).
   - Normalization: scalar in \[0, 1\], where:
     - `1.0` ≈ clear daylight
     - values decrease toward `0.0` as visibility worsens (night, heavy fog/rain).

**State vector layout (ordered):**

```text
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
```

The Python training environment and the runtime `DQNDecisionEngine` **must build this vector identically**.

---

### 2. Discrete Action Space

The DQN controls the same high‑level discrete actions currently used by the utility‑based `DecisionEngine`:

1. `STRAIGHT`  – maintain current steering toward the lane center.
2. `LEFT`      – initiate/continue a leftward steering maneuver (turn or lane change).
3. `RIGHT`     – initiate/continue a rightward steering maneuver.
4. `BRAKE`     – apply braking / reduce speed.
5. `ACCELERATE` – increase throttle within safety bounds.

The action indices used in training must be **fixed and documented**, e.g.:

```text
0 → STRAIGHT
1 → LEFT
2 → RIGHT
3 → BRAKE
4 → ACCELERATE
```

The runtime `DQNDecisionEngine` will adopt this same mapping when turning Q‑values into labeled actions.

---

### 3. Reward Function

The scalar reward signal is aligned with the game’s scoring and safety/ethics goals. It strongly penalizes unsafe behavior and rule violations, and mildly rewards safe progress.

All values below are suggested magnitudes; they can be tuned during training as long as the qualitative priorities remain:

#### 3.1 Large negative events

- **Hit pedestrian / child / animal**
  - Reward: `-2.0`
  - Rationale: worst outcome; must be extremely rare in trained policy.

- **Collision with vehicle / building / barrier / cone**
  - Reward: `-1.5`
  - Rationale: serious but less severe than hitting a pedestrian.

- **Run red light**
  - Reward: `-1.0`
  - Rationale: major traffic violation, even if no collision happens immediately.

#### 3.2 Positive progress

- **Waypoint reached**
  - Reward: `+0.5`
  - Rationale: incentivizes mission progress along the route.

- **Yield correctly to emergency vehicle**
  - Reward: `+0.2`
  - Rationale: reinforces desired behavior around sirens.

- **Safe driving step**
  - Reward: `+0.1` per time step when:
    - No collision or rule violation,
    - Under or at speed limit (within tolerance),
    - No imminent collision according to world state.

#### 3.3 Shaping / regularization

- **Time penalty**
  - Reward: `-0.01` per step (always).
  - Rationale: discourages aimless stalling; encourages efficient progress.

- **Heavy speeding**
  - If `speed_ratio > 1.2` (significantly over limit):
  - Additional reward: `-0.1` per step.
  - Rationale: teaches agent to respect speed limits, especially in sensitive zones.

These terms are combined each step into a single scalar reward \(r_t\).

---

### 4. Episode Definition

An episode in the training environment corresponds to a single simulated drive under a particular world seed and starting configuration.

#### 4.1 Episode start

- Reset world to a start pose and random (but reproducible) configuration:
  - Road layout / intersections as needed by the simplified env.
  - Positions of key obstacles and pedestrians.
  - Zone types (including potential school‑zone segments).
  - Initial weather/visibility.
- Return initial state vector \(s_0\) as defined in Section 1.

#### 4.2 Episode termination (done conditions)

An episode terminates when **any** of the following occur:

1. **Terminal unsafe event**
   - Collision with pedestrian, animal, or another vehicle.
   - Severe crash into building/barrier.

2. **Goal completion**
   - Reaching a designated final waypoint or end‑of‑route region.

3. **Time horizon exceeded**
   - A fixed maximum number of decision steps per episode, e.g. 400–600 steps, is reached.
   - Prevents infinite wandering and keeps episodes bounded for DQN training.

The final transition uses the same reward rules, and the environment returns `done = True`.

---

### 5. Safety Layer Relationship

The DQN **does not** replace the hard safety rules encoded in `SafetyBehaviorTree`. At runtime:

1. Safety overrides are evaluated first using `worldState` and `perception`.
2. If a safety override is active, its action (e.g. `EMERGENCY_BRAKE`, `STOP`, `RIGHT`) is taken regardless of DQN output.
3. If there is **no** safety override, the DQN’s argmax Q‑value selects one of the 5 discrete actions.

During training in the simplified environment, the same spirit should hold: the reward formulation already encodes very strong penalties for unsafe behavior; any additional “virtual safety layer” in the training environment should be designed to mirror the runtime behavior as closely as practical.

---

### 6. Invariants and Implementation Notes

- The **ordering and scaling** of state features must be identical in:
  - The Python training environment’s `reset()` and `step()` methods, and
  - The runtime `buildStateVector(worldState, perception)` helper in `DQNDecisionEngine`.
- The **action index mapping** (Section 2) must be fixed and shared between training code, exported model, and runtime decision logic.
- Reward magnitudes may be tuned during experimentation, but the following **qualitative priorities must never change**:
  - Hitting pedestrians and major collisions are far worse than any other mistake.
  - Running red lights and heavy speeding are strongly discouraged.
  - Safe progress toward waypoints is consistently but moderately rewarded.

This spec is the single source of truth for the DQN decision layer and should be updated only when both the training environment and runtime integration are adjusted in sync.

