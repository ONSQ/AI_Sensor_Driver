import * as tf from '@tensorflow/tfjs';
import { DecisionEngine } from './DecisionEngine.js';

/**
 * DQNDecisionEngine
 *
 * Wraps a pre-trained DQN policy (exported via rl_training/export_weights_to_json.py)
 * and exposes the same evaluate(...) API as the existing utility-based DecisionEngine.
 *
 * If the DQN weights fail to load, it transparently falls back to the
 * original DecisionEngine so the game remains playable.
 */
export class DQNDecisionEngine {
    constructor(options = {}) {
        this.model = null;
        this.isReady = false;
        this.weightsUrl = options.weightsUrl || '/dqn/sensor_racer_dqn_weights.json';
        this.fallbackDecision = new DecisionEngine();

        this.candidateActions = [
            { id: 'STRAIGHT', label: 'Drive Straight' },
            { id: 'LEFT', label: 'Turn Left' },
            { id: 'RIGHT', label: 'Turn Right' },
            { id: 'BRAKE', label: 'Brake' },
            { id: 'ACCELERATE', label: 'Accelerate' },
        ];
    }

    async initialize() {
        // Ensure TF.js backend is ready before building the model
        try {
            await Promise.race([
                tf.ready(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TF.js init timeout (DQNDecisionEngine)')), 1500))
            ]);
        } catch (err) {
            console.error('[DQNDecisionEngine] Failed to initialize TF.js backend, using fallback DecisionEngine:', err);
            this.isReady = false;
            return;
        }

        try {
            const res = await fetch(this.weightsUrl, { cache: 'no-store' });
            if (!res.ok) {
                throw new Error(`Failed to fetch DQN weights: HTTP ${res.status}`);
            }
            const payload = await res.json();
            this._buildModelFromWeights(payload);
            this.isReady = true;
            console.log('[DQNDecisionEngine] Loaded pre-trained DQN weights from', this.weightsUrl);
        } catch (err) {
            console.warn('[DQNDecisionEngine] Could not load DQN weights, using fallback DecisionEngine instead.', err);
            this.isReady = false;
        }
    }

    /**
     * Build a small tf.Sequential model from the JSON weights exported
     * by rl_training/export_weights_to_json.py.
     *
     * Expected payload format:
     * {
     *   layers: [
     *     {
     *       type: "dense",
     *       input_dim: number,
     *       output_dim: number,
     *       activation: "relu" | "linear",
     *       weight: number[][], // shape [out_dim, in_dim] (PyTorch format)
     *       bias: number[],     // shape [out_dim]
     *     },
     *     ...
     *   ]
     * }
     */
    _buildModelFromWeights(payload) {
        if (!payload || !Array.isArray(payload.layers) || payload.layers.length === 0) {
            throw new Error('Invalid DQN weight payload: missing layers');
        }

        const layersDef = payload.layers;
        const model = tf.sequential();

        layersDef.forEach((layerDef, idx) => {
            if (layerDef.type !== 'dense') return;

            const isFirst = idx === 0;
            const activation = layerDef.activation === 'relu'
                ? 'relu'
                : 'linear';

            model.add(tf.layers.dense({
                units: layerDef.output_dim,
                inputShape: isFirst ? [layerDef.input_dim] : undefined,
                activation,
                useBias: true,
            }));
        });

        // Now set weights for each dense layer
        model.layers.forEach((layer, idx) => {
            const def = layersDef[idx];
            if (!def || def.type !== 'dense') return;

            // PyTorch Linear uses [out_features, in_features]
            const w = tf.tensor2d(def.weight, [def.output_dim, def.input_dim]).transpose(); // -> [in, out]
            const b = tf.tensor1d(def.bias);
            layer.setWeights([w, b]);
        });

        this.model = model;
    }

    /**
     * Build the 11D state vector from worldState/perception,
     * following docs/dqn_decision_rl_spec.md.
     */
    _buildStateVector(worldState, perception) {
        // Default worldState to avoid crashes if called with undefined
        const ws = worldState || {};
        const MAX_SENSOR_DISTANCE = 60; // meters, must match training

        const rawDistFront = typeof ws.distanceToObstacle === 'number' ? ws.distanceToObstacle : 100;
        const clamp01 = (v) => Math.max(0, Math.min(1, v));

        const normDist = (d) => {
            if (d < 0) return 0;
            if (d > MAX_SENSOR_DISTANCE) return 1;
            return d / MAX_SENSOR_DISTANCE;
        };

        const dist_front = normDist(rawDistFront);
        // For now, use the same scalar distance for left/right (the env is largely lane-based)
        const dist_left = dist_front;
        const dist_right = dist_front;

        let light_red = 0;
        let light_yellow = 0;
        let light_green = 0;

        // In the current worldState, "approachingRedLight" conflates red/yellow.
        // Map it to "must stop" semantics via red bit.
        if (ws.approachingRedLight) {
            light_red = 1;
        }

        // Use the stricter "pedestrianInMyPath" flag for RL, falling back to the
        // older pedestrianInCrosswalk flag if needed for robustness.
        const ped_in_path = ws.pedestrianInMyPath
            ? 1
            : (ws.pedestrianInCrosswalk ? 1 : 0);

        const speed = typeof ws.speed === 'number' ? ws.speed : 0;
        const speedLimit = typeof ws.speedLimit === 'number' && ws.speedLimit > 0 ? ws.speedLimit : 1;
        let speed_ratio = speed / speedLimit;
        if (!Number.isFinite(speed_ratio)) speed_ratio = 0;
        speed_ratio = Math.max(0, Math.min(2, speed_ratio));

        let aligned_to_waypoint = 0;
        if (ws.alignedWithWaypoint === false) {
            if (ws.targetDirection === 'LEFT') aligned_to_waypoint = -1;
            if (ws.targetDirection === 'RIGHT') aligned_to_waypoint = 1;
        }

        const zone_school = ws.zoneIsSchool ? 1 : 0;

        let visibility = 1;
        if (typeof ws.visibility === 'number') {
            visibility = clamp01(ws.visibility);
        }

        return tf.tensor2d([[
            dist_front,
            dist_left,
            dist_right,
            light_red,
            light_yellow,
            light_green,
            ped_in_path,
            speed_ratio,
            aligned_to_waypoint,
            zone_school,
            visibility,
        ]]);
    }

    /**
     * Evaluate the current state and return Q-value-based decision.
     * Falls back to the original DecisionEngine if DQN is not available.
     *
     * @param {Object} state   The current worldState from AIController
     * @param {Object} perception Output from PerceptionEngine (unused directly here but kept for signature parity)
     * @returns {{ chosenAction: string, chosenScore: number, allScores: {action: string, score: number, label: string}[], engineType?: string }}
     */
    evaluate(state, perception) {
        // If DQN model isn't ready, delegate to rule-based DecisionEngine
        if (!this.model || !this.isReady) {
            const fallback = this.fallbackDecision.evaluate(state, perception);
            return { ...fallback, engineType: 'rule' };
        }

        try {
            const qValues = tf.tidy(() => {
                const input = this._buildStateVector(state, perception);
                const out = this.model.predict(input);
                const q = Array.isArray(out) ? out[0] : out;
                return q.dataSync();
            });

            const scores = this.candidateActions.map((actionDef, idx) => ({
                action: actionDef.id,
                label: actionDef.label,
                score: qValues[idx] ?? 0,
            }));

            scores.sort((a, b) => b.score - a.score);
            const chosen = scores[0];

            return {
                chosenAction: chosen.action,
                chosenScore: chosen.score,
                allScores: scores,
                engineType: 'dqn',
            };
        } catch (err) {
            console.error('[DQNDecisionEngine] Error during DQN evaluation, using fallback DecisionEngine:', err);
            const fallback = this.fallbackDecision.evaluate(state, perception);
            return { ...fallback, engineType: 'rule' };
        }
    }
}

