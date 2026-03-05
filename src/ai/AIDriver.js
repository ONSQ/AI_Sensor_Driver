import { PerceptionEngine } from './PerceptionEngine.js';
import { SafetyBehaviorTree } from './SafetyBehaviorTree.js';
import { DQNDecisionEngine } from './DQNDecisionEngine.js';

/**
 * AIDriver
 * Orchestrates the Hybrid AI architecture for the Ego Vehicle.
 * Pipes data through Perception -> Safety -> Decision.
 */
export class AIDriver {
    constructor() {
        this.perception = new PerceptionEngine();
        // DQN-based decision engine (falls back to rule-based if DQN is unavailable)
        this.decision = new DQNDecisionEngine();
        this.safety = new SafetyBehaviorTree();
        this.isInitialized = false;
    }

    async init() {
        await this.perception.initialize();
        if (this.decision && typeof this.decision.initialize === 'function') {
            await this.decision.initialize();
        }
        this.isInitialized = true;
        console.log('[AIDriver] Hybrid Architecture Initialized (Perception + Safety + DQN Decision).');
    }

    /**
     * Main tick for the AI Driver. Called per frame or at a fixed interval.
     * @param {Object} sensors Raw sensor data arrays
     * @param {Object} activeSensors Toggled state of sensors from SensorManager
     * @param {Object} worldState Extracted world context (speed, waypoints, obstacles)
     * @returns {Object} Selected action and detailed logs for the Glass Box UI
     */
    async tick(sensors, activeSensors, worldState) {
        if (!this.isInitialized) return null;

        // 1. Perception
        const perceptionResult = await this.perception.evaluate(sensors, activeSensors, worldState);

        // 2. Safety Override 
        const safetyOverride = this.safety.evaluate(worldState, perceptionResult);

        let finalAction;
        let decisionResult = null;
        let overrideTriggered = false;

        if (safetyOverride) {
            finalAction = safetyOverride.action;
            overrideTriggered = true;
        } else {
            // 3. DQN / utility decision scoring
            decisionResult = this.decision.evaluate(worldState, perceptionResult);
            finalAction = decisionResult.chosenAction;

            // 4. Navigation-aware steering & speed bias
            // Hybrid approach: let the DQN reason about safety and speed,
            // but gently enforce that the vehicle actively pursues the
            // current waypoint when the path is clear.
            const ws = worldState || {};

            const pathClear = ws.pathClear !== false;
            const distanceToObstacle = typeof ws.distanceToObstacle === 'number' ? ws.distanceToObstacle : 100;
            const speed = typeof ws.speed === 'number' ? ws.speed : 0;
            const speedLimit = typeof ws.speedLimit === 'number' && ws.speedLimit > 0 ? ws.speedLimit : 1;

            // Any explicit LEFT/RIGHT steering target (from waypoint routing,
            // lane-centering, or an active overtake) should be honored when it
            // is safe to do so. This keeps the vehicle both following the route
            // and holding a stable side of the road instead of weaving.
            const overtakeSide =
                ws.inOvertake && (ws.overtakeSide === 'LEFT' || ws.overtakeSide === 'RIGHT')
                    ? ws.overtakeSide
                    : null;
            const steeringTarget = overtakeSide || ws.targetDirection;
            const needsTurn =
                steeringTarget === 'LEFT' || steeringTarget === 'RIGHT';

            // If we clearly need to turn toward the steering target and the way
            // ahead is open, prefer steering in that direction over whatever
            // the learned policy suggested.
            if (needsTurn && pathClear && distanceToObstacle > 10) {
                finalAction = steeringTarget;
            } else if (pathClear && distanceToObstacle > 20) {
                // If the road is clear and we're well below the speed limit,
                // nudge the policy toward accelerating instead of braking or coasting.
                const speedRatio = speed / speedLimit;
                if (speedRatio < 0.9) {
                    if (finalAction === 'BRAKE') {
                        finalAction = 'ACCELERATE';
                    } else if (finalAction === 'STRAIGHT') {
                        finalAction = 'ACCELERATE';
                    }
                }
            }

            // 5. Enforce per-zone speed limits at the controller level.
            // Do not allow the learned policy to accelerate once we're at
            // the limit, and actively brake if we're over.
            const speedRatio = speed / speedLimit;

            // Never accelerate at or above the limit.
            if (speedRatio >= 1.0 && finalAction === 'ACCELERATE') {
                finalAction = 'STRAIGHT';
            }

            // If we are slightly over the limit, favor gentle braking.
            if (speedRatio > 1.05 && finalAction === 'STRAIGHT') {
                finalAction = 'BRAKE';
            }

            // If we are well above the limit, always brake until we are back down.
            if (speedRatio > 1.15 && finalAction !== 'BRAKE') {
                finalAction = 'BRAKE';
            }
        }

        return {
            action: finalAction,
            perception: perceptionResult,
            decision: decisionResult,
            safety: safetyOverride,
            isOverride: overrideTriggered,
            // Expose world state for Glass Box panels and logging
            worldState,
        };
    }
}
