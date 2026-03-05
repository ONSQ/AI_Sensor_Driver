import { PerceptionEngine } from './PerceptionEngine.js';
import { DQNEngine } from './DQNEngine.js';
import { SafetyBehaviorTree } from './SafetyBehaviorTree.js';

/**
 * AIDriver
 * Orchestrates the Hybrid AI architecture for the Ego Vehicle.
 * Pipes data through Perception -> Safety -> Decision.
 */
export class AIDriver {
    constructor() {
        this.perception = new PerceptionEngine();
        this.decision = new DQNEngine();
        this.safety = new SafetyBehaviorTree();
        this.isInitialized = false;
    }

    async init() {
        await this.perception.initialize();
        await this.decision.initialize(); // Load the pre-trained weights
        this.isInitialized = true;
        console.log('[AIDriver] Hybrid DQN Architecture Initialized.');
    }

    /**
     * Main tick for the AI Driver. Called per frame or at a fixed interval.
     * @param {Object} sensors Raw sensor data arrays
     * @param {Object} activeSensors Toggled state of sensors from SensorManager
     * @param {Object} worldState Extracted world context (speed, waypoints, obstacles)
     * @param {Object} dqnState Normalized tensor-ready numerical data extracted from physics
     * @returns {Object} Selected action and detailed logs for the Glass Box UI
     */
    async tick(sensors, activeSensors, worldState, dqnState) {
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
            // 3. Reinforcement Learning Action Forward Pass
            decisionResult = this.decision.evaluate(dqnState);
            finalAction = decisionResult ? decisionResult.chosenAction : 'STRAIGHT';
        }

        return {
            action: finalAction,
            perception: perceptionResult,
            decision: decisionResult,
            safety: safetyOverride,
            isOverride: overrideTriggered
        };
    }
}
