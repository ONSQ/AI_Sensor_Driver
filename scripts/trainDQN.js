import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Custom file writer for pure TFJS in Node
function fileSystemWriter(destPath) {
    return {
        save: async (modelArtifacts) => {
            const weightsData = new Uint8Array(modelArtifacts.weightData);
            const weightsFilename = 'weights.bin';
            modelArtifacts.weightSpecs.forEach(s => s.paths = [weightsFilename]);

            const topology = {
                format: modelArtifacts.format,
                generatedBy: modelArtifacts.generatedBy,
                convertedBy: modelArtifacts.convertedBy,
                modelTopology: modelArtifacts.modelTopology,
                weightsManifest: [{
                    paths: [weightsFilename],
                    weights: modelArtifacts.weightSpecs
                }]
            };

            fs.writeFileSync(path.join(destPath, 'dqn_driver.json'), JSON.stringify(topology));
            fs.writeFileSync(path.join(destPath, weightsFilename), weightsData);

            return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
        }
    };
}

// --- CONFIGURATION ---
const NUM_EPISODES = 5;
const MAX_STEPS = 100;
const BATCH_SIZE = 16;
const GAMMA = 0.95;
const EPSILON_MIN = 0.05;
const EPSILON_DECAY = 0.995;
let epsilon = 1.0;

const STATE_SIZE = 9; // speed(1), crossTrack(1), heading(1), intersection(1), lidar(5)
const ACTION_SIZE = 5; // Accel, Left, Right, Brake, Reverse

// --- REPLAY BUFFER ---
class ReplayBuffer {
    constructor(maxSize) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    add(state, action, reward, nextState, done) {
        if (this.buffer.length >= this.maxSize) this.buffer.shift();
        this.buffer.push({ state, action, reward, nextState, done });
    }
    sample(batchSize) {
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
            const index = Math.floor(Math.random() * this.buffer.length);
            batch.push(this.buffer[index]);
        }
        return batch;
    }
    size() {
        return this.buffer.length;
    }
}

// --- MODEL ARCHITECTURE ---
function createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 24, activation: 'relu', inputShape: [STATE_SIZE] }));
    model.add(tf.layers.dense({ units: 5, activation: 'linear' }));
    model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
    return model;
}

// --- MOCK ENVIRONMENT ---
// Simulates the physical state transitions for offline training
class MockDrivingEnv {
    constructor() {
        this.reset();
    }

    reset() {
        // [speed, crossTrack, heading, intersection, lidarLL, lidarL, lidarC, lidarR, lidarRR]
        this.state = [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0];
        this.steps = 0;
        return this.state;
    }

    step(action) {
        this.steps++;
        let reward = 0;
        let done = false;

        // Action Map: 0: ACCEL, 1: LEFT, 2: RIGHT, 3: BRAKE, 4: REVERSE

        // Simulate physics updates based on action (Highly simplified linear transitions)
        if (action === 0) { // ACCEL
            this.state[0] = Math.min(1.0, this.state[0] + 0.1);
            reward += 1.0; // Reward for making progress
        } else if (action === 3) { // BRAKE
            this.state[0] = Math.max(0.0, this.state[0] - 0.2);
            reward -= 0.1; // Slight penalty for braking for no reason
        } else if (action === 4) { // REVERSE
            this.state[0] = 0.0;
            reward -= 0.5; // Heavy penalty for reversing unless stuck
        } else if (action === 1) { // LEFT
            this.state[1] = Math.max(-1.0, this.state[1] - 0.2); // Move left in lane
            this.state[2] = Math.max(-1.0, this.state[2] - 0.1); // Heading left
        } else if (action === 2) { // RIGHT
            this.state[1] = Math.min(1.0, this.state[1] + 0.2); // Move right in lane
            this.state[2] = Math.min(1.0, this.state[2] + 0.1); // Heading right
        }

        // Simulate Obstacle approach 
        if (this.steps % 50 === 0) {
            this.state[6] = 0.2; // Sudden obstacle in center ray
        }

        // Evaluate state for rewards and penalties

        // 1. Crash condition (Hit an obstacle directly)
        if (this.state[6] < 0.1) {
            reward -= 100;
            done = true; // Episode over
        }

        // 2. Off-road condition (Cross-track error too high)
        if (Math.abs(this.state[1]) > 0.8) {
            reward -= 50;
            done = true; // Episode over
        }

        // 3. Good driving (Stayed centered with good speed)
        if (Math.abs(this.state[1]) < 0.2 && this.state[0] > 0.4) {
            reward += 2.0;
        }

        // 4. Safe braking for obstacle
        if (this.state[6] < 0.3 && this.state[0] < 0.2) {
            reward += 5.0; // Rewarded for stopping before hitting obstacle
        }

        // Recover obstacle rays slowly over time
        for (let i = 4; i < 9; i++) {
            this.state[i] = Math.min(1.0, this.state[i] + 0.05);
        }

        if (this.steps >= MAX_STEPS) done = true;

        return { nextState: [...this.state], reward, done };
    }
}

// --- TRAINING LOOP ---
async function train() {
    console.log("Initializing DQN Training Protocol...");

    let model = createModel();
    let targetModel = createModel();
    targetModel.setWeights(model.getWeights()); // Sync initial weights

    const buffer = new ReplayBuffer(10000);
    const env = new MockDrivingEnv();

    for (let episode = 1; episode <= NUM_EPISODES; episode++) {
        let state = env.reset();
        let totalReward = 0;
        let stepCount = 0;
        let done = false;

        while (!done) {
            stepCount++;
            let action;

            // Epsilon-Greedy Action Selection
            if (Math.random() <= epsilon) {
                action = Math.floor(Math.random() * ACTION_SIZE); // Explore
            } else {
                const qValues = tf.tidy(() => {
                    const stateTensor = tf.tensor2d([state], [1, STATE_SIZE]);
                    return model.predict(stateTensor).dataSync();
                });
                action = qValues.indexOf(Math.max(...qValues)); // Exploit
            }

            // Step environment
            const { nextState, reward, isDone } = env.step(action);
            done = isDone;
            totalReward += reward;

            // Store experience
            buffer.add(state, action, reward, nextState, done);
            state = nextState;

            // Replay and Train Network (Every 10 steps to run fast on CPU)
            if (buffer.size() >= BATCH_SIZE && stepCount % 10 === 0) {
                const batch = buffer.sample(BATCH_SIZE);

                const [xTensor, yTensor] = tf.tidy(() => {
                    const states = batch.map(b => b.state);
                    const actions = batch.map(b => b.action);
                    const rewards = batch.map(b => b.reward);
                    const nextStates = batch.map(b => b.nextState);
                    const dones = batch.map(b => b.done);

                    const statesTensor = tf.tensor2d(states, [BATCH_SIZE, STATE_SIZE]);
                    const nextStatesTensor = tf.tensor2d(nextStates, [BATCH_SIZE, STATE_SIZE]);

                    // Current Q-values
                    const currentQs = model.predict(statesTensor).arraySync();
                    // Future Q-values from Target Network
                    const nextQs = targetModel.predict(nextStatesTensor).arraySync();

                    const x = [];
                    const y = [];

                    for (let i = 0; i < BATCH_SIZE; i++) {
                        let target = rewards[i];
                        if (!dones[i]) {
                            target = rewards[i] + GAMMA * Math.max(...nextQs[i]);
                        }
                        const targetF = currentQs[i];
                        targetF[actions[i]] = target;

                        x.push(states[i]);
                        y.push(targetF);
                    }

                    return [tf.tensor2d(x), tf.tensor2d(y)];
                });

                // Perform one gradient descent step 
                await model.fit(xTensor, yTensor, { epochs: 1, verbose: 0 });

                // Clean up detached tensors
                xTensor.dispose();
                yTensor.dispose();
            }
        } // End of Episode

        // Decay Epsilon
        if (epsilon > EPSILON_MIN) epsilon *= EPSILON_DECAY;

        // Update Target Network occasionally
        if (episode % 10 === 0) {
            targetModel.setWeights(model.getWeights());
        }

        // Output progress every episode so the user doesn't think it hung
        if (episode % 1 === 0) {
            console.log(`Episode: ${episode}/${NUM_EPISODES} | Total Reward: ${totalReward.toFixed(2)} | Epsilon: ${epsilon.toFixed(3)}`);
        }
    }

    console.log("Training Complete. Saving Model...");

    // Ensure models directory exists inside public
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const modelDir = path.resolve(__dirname, '../public/models');
    if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
    }

    await model.save(fileSystemWriter(modelDir));

    console.log("Model saved to /public/models/dqn_driver.json");
}

train();
