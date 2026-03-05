/**
 * Safety Behavior Tree
 * Hard non-negotiable rules that run before the Decision Engine.
 */
export class SafetyBehaviorTree {
  /**
   * Evaluates critical safety conditions.
   * @param {Object} worldState Information about immediate surroundings
   * @returns {Object|null} Override action if triggered, null otherwise
   */
  evaluate(worldState, perception) {
    const overrides = [];

    // Rule 1: Imminent Collision
    // Needs to be > 5m to have enough physical space to stop from 10m/s
    if (worldState.distanceToObstacle < 6.0) {
      overrides.push({
        action: 'EMERGENCY_BRAKE',
        reason: `Imminent collision at ${worldState.distanceToObstacle.toFixed(1)}m`,
        priority: 1
      });
    }

    // Rule 1.5: ML Model Threat Classification
    if (perception && worldState.distanceToObstacle < 15) {
      if (perception.classification === 'Pedestrian' && perception.confidence > 0.7) {
        overrides.push({
          action: 'EMERGENCY_BRAKE',
          reason: `ML Classification: Pedestrian Yield (${Math.round(perception.confidence * 100)}%)`,
          priority: 1
        });
      }
    }

    // Rule 2: Red Light
    if (worldState.approachingRedLight && worldState.distanceToIntersection < 10) {
      if (!worldState.inIntersection) {
        overrides.push({
          action: 'STOP',
          reason: 'Red traffic light ahead',
          priority: 2
        });
      }
    }

    // Rule 2.5: Stop Sign Yield
    if (worldState.approachingStopSign && worldState.distanceToIntersection < 10) {
      if (!worldState.inIntersection) {
        overrides.push({
          action: 'STOP',
          reason: 'Yielding at Stop Sign',
          priority: 2
        });
      }
    }

    // Rule 3: Pedestrian directly in ego path
    // Only trigger a hard stop if a pedestrian is actually in the lane/path ahead,
    // not just anywhere in a nearby crosswalk.
    if (worldState.pedestrianInMyPath) {
      overrides.push({
        action: 'STOP',
        reason: 'Pedestrian yielding',
        priority: 3
      });
    }

    // Rule 4: Emergency Vehicle Siren
    if (worldState.emergencySirenHeard) {
      overrides.push({
        action: 'RIGHT', // Simulate pulling over to the right
        reason: 'Yielding to Emergency Siren',
        priority: 4
      });
    }

    if (overrides.length > 0) {
      // Return the highest priority override
      overrides.sort((a, b) => a.priority - b.priority);
      return overrides[0];
    }

    return null; // Return null if it's safe to use utility scoring
  }
}
