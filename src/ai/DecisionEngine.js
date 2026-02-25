/**
 * Decision Engine
 * Utility-based scoring system for selecting optimal driving actions.
 */
export class DecisionEngine {
    constructor() {
        this.candidateActions = [
            { id: 'STRAIGHT', label: 'Drive Straight' },
            { id: 'LEFT', label: 'Turn Left' },
            { id: 'RIGHT', label: 'Turn Right' },
            { id: 'BRAKE', label: 'Brake' },
            { id: 'ACCELERATE', label: 'Accelerate' },
        ];
    }

    /**
     * Scores all possible actions and returns the best one.
     * @param {Object} state Current vehicle and environmental state
     * @param {Object} perception Output from Perception Engine
     * @returns {Object} Best action and complete scoring breakdown
     */
    evaluate(state, perception) {
        const scores = this.candidateActions.map(action => {
            let score = 50; // Base score

            if (action.id === 'STRAIGHT') {
                score += state.pathClear ? 30 : -50;
                score += state.alignedWithWaypoint ? 20 : -10;
            }

            if (action.id === 'BRAKE') {
                score += !state.pathClear ? 100 : -40; // Extremely high utility to brake if path blocked

                // Also gently brake to slow down for sharp turns if we are going too fast
                if (!state.alignedWithWaypoint && state.speed > 12) {
                    score += 80;
                }

                // Normal braking for speed limit adherence
                if (state.speed > state.speedLimit) {
                    score += 50;
                }
            }

            if (action.id === 'ACCELERATE') {
                score += (state.pathClear && state.speed < state.speedLimit) ? 40 : -60;

                // Do not accelerate into sharp turns
                if (!state.alignedWithWaypoint) {
                    score -= 50;
                }
            }

            if (action.id === 'LEFT' || action.id === 'RIGHT') {
                // Simple logic for direction toward waypoint
                if (state.targetDirection === action.id) {
                    score += 60; // Make turning highly prioritized when needed
                } else {
                    score -= 30;
                }

                // Obstacle avoidance override: If path is blocked, heavily favor turning AWAY from the obstacle
                // (In a real system, LiDAR would give a left/right clearance heuristic. Here we just try to swerve
                // in the opposite direction of the waypoint if we are blocked, or strongly favor any turn over straight).
                if (!state.pathClear && state.speed > 5) {
                    if (state.targetDirection === action.id) {
                        // Even if it's the target direction, turning might be better than hitting it straight on
                        score += 30;
                    } else if (state.targetDirection === 'STRAIGHT') {
                        // If waypoint is straight ahead but blocked, pick a direction to swerve
                        // Default to right for standard right-hand traffic rules where possible
                        if (action.id === 'RIGHT') score += 50;
                        if (action.id === 'LEFT') score += 40;
                    }
                }
            }

            return { action: action.id, score, label: action.label };
        });

        // Sort descending by score
        scores.sort((a, b) => b.score - a.score);

        const chosenAction = scores[0];

        return {
            chosenAction: chosenAction.action,
            chosenScore: chosenAction.score,
            allScores: scores
        };
    }
}
