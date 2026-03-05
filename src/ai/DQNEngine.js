import * as tf from '@tensorflow/tfjs';

/**
 * Deep Q-Network Engine
 * Loads pre-trained model weights to make driving decisions based on a normalized state tensor.
 */
export class DQNEngine {
    constructor() {
        this.model = null;
        this.isLoaded = false;

        // Match these exactly to the offline trainer's action space
        this.actions = [
            { id: 'ACCELERATE', label: 'ACCEL / MAINTAIN' },
            { id: 'LEFT', label: 'STEER LEFT' },
            { id: 'RIGHT', label: 'STEER RIGHT' },
            { id: 'BRAKE', label: 'BRAKE' },
            { id: 'REVERSE', label: 'REVERSE' }
        ];
    }

    /**
     * Initializes the DQN by loading pre-trained weights from the public models directory.
     * Fallbacks to a randomly initialized model if no weights exist yet (for testing).
     */
    async initialize() {
        try {
            // TF.js can hang indefinitely on some systems without proper WebGL/WebGPU support
            await Promise.race([
                tf.ready(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TF.js init timeout')), 1500))
            ]);

            // Try downloading pre-trained json + weights
            this.model = await tf.loadLayersModel('/models/dqn_driver.json');
            this.isLoaded = true;
            console.log('[DQN] Pre-trained weights loaded successfully.');
        } catch (e) {
            console.warn('[DQN] No pre-trained weights found at /models/dqn_driver.json. Creating an untrained placeholder network to prevent a crash.');

            this.model = tf.sequential();
            // Input: [speed, crossTrackError, headingError, intersectionStatus, 5x lidarRays]
            this.model.add(tf.layers.dense({ units: 24, activation: 'relu', inputShape: [9] }));
            // Output: 5 discrete Q-Values (including REVERSE)
            this.model.add(tf.layers.dense({ units: 5, activation: 'linear' }));

            this.isLoaded = true;
        }
    }

    /**
     * Executes the Forward Pass on the Neural Network and interprets the output.
     * @param {Object} state The normalized numeric state variables 
     * @returns {Object} Selected action and raw Q-Values for the Glass Box UI
     */
    evaluate(state) {
        if (!this.isLoaded || !this.model) return null;

        // Convert incoming state object into a flattened array
        // MUST MATCH THE SHAPE EXACTLY AS IN THE TRAINING SCRIPT
        const rays = state.lidarRays || [1.0, 1.0, 1.0, 1.0, 1.0];
        const stateArray = [
            state.normalizedSpeed || 0.0,
            state.crossTrackError || 0.0,
            state.headingError || 0.0,
            state.inIntersection ? 1.0 : 0.0,
            ...rays
        ];

        return tf.tidy(() => {
            const inputTensor = tf.tensor2d([stateArray], [1, 9]);

            // Predict Q-Values for all 5 actions given the current state
            const qValuesTensor = this.model.predict(inputTensor);
            const qValues = qValuesTensor.dataSync();

            // Find the action with the highest Q-Value
            const maxIndex = qValues.indexOf(Math.max(...qValues));
            const bestAction = this.actions[maxIndex];

            // Map scores for the Glass Box UI
            const allScores = this.actions.map((act, index) => ({
                action: act.id,
                label: act.label,
                score: qValues[index].toFixed(2) // Format visually with 2 decimals
            }));

            // Sort descending strictly for the visualization panel
            allScores.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

            return {
                chosenAction: bestAction.id,
                chosenScore: qValues[maxIndex].toFixed(2),
                allScores: allScores
            };
        });
    }
}
