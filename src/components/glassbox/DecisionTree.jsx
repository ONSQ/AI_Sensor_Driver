export default function DecisionTree({ data }) {
    if (!data) return null;

    return (
        <div style={{ marginTop: '10px' }}>
            <h3 style={{ fontSize: '12px', color: '#ffaa00', margin: '0 0 5px 0' }}>DECISION LOOP</h3>

            <div style={{ fontSize: '11px', background: 'rgba(0,0,0,0.4)', padding: '8px' }}>
                <div style={{ color: data.isOverride ? '#ff4444' : '#555', fontWeight: data.isOverride ? 'bold' : 'normal' }}>
                    1. Safety Check {data.isOverride ? '➔ FAILED' : '➔ PASS'}
                </div>
                {data.isOverride && data.safety && (
                    <div style={{ marginLeft: '10px', color: '#ff4444' }}>
                        Override: {data.safety.action} ({data.safety.reason})
                    </div>
                )}

                <div style={{ color: !data.isOverride ? '#00ff88' : '#555', marginTop: '6px' }}>
                    2. Utility Scoring {data.isOverride ? '(Skipped)' : ''}
                </div>
                {!data.isOverride && data.decision && (
                    <div style={{ marginLeft: '10px', color: '#ccc' }}>
                        {data.decision.allScores.slice(0, 3).map((s, i) => (
                            <div key={i} style={{ color: i === 0 ? '#00ff88' : '#aaa' }}>
                                {s.label}: {s.score} {i === 0 ? '➔ CHOSEN' : ''}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
