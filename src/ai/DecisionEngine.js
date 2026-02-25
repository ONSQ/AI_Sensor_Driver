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
                score += !state.pathClear ? 80 : -40; // High utility to brake if path blocked
            }

            if (action.id === 'ACCELERATE') {
                score += (state.pathClear && state.speed < state.speedLimit) ? 40 : -60;
            }

            if (action.id === 'LEFT' || action.id === 'RIGHT') {
                // Simple logic for direction toward waypoint
                if (state.targetDirection === action.id) {
                    score += 40;
                } else {
                    score -= 30;
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
