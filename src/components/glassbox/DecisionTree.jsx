export default function DecisionTree({ data }) {
    if (!data) return null;

    return (
        <div style={{ marginTop: '10px' }}>
            <h3 style={{ fontSize: '12px', color: '#ffaa00', margin: '0 0 5px 0' }}>AI PIPELINE</h3>

            <div style={{ fontSize: '11px', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '4px' }}>
                {/* Perception Level */}
                <div style={{ color: '#00ff88', fontWeight: 'bold' }}>
                    1. Perception Engine (ML)
                </div>
                <div style={{ marginLeft: '15px', color: '#ffaa00', borderLeft: '1px solid #00ff88', paddingLeft: '8px', marginBottom: '8px' }}>
                    <div>Class: {data.perception?.classification}</div>
                    <div>Confidence: {Math.round((data.perception?.confidence || 0) * 100)}%</div>
                </div>

                {/* Decision Level */}
                <div style={{ color: data.isOverride ? '#ff4444' : '#00ff88', fontWeight: 'bold' }}>
                    2. Decision Tree (Safety) {data.isOverride ? '➔ TRIGGERED' : '➔ CLEAR'}
                </div>
                <div style={{ marginLeft: '15px', color: data.isOverride ? '#ff4444' : '#ccc', borderLeft: `1px solid ${data.isOverride ? '#ff4444' : '#00ff88'}`, paddingLeft: '8px', marginBottom: '8px' }}>
                    {data.isOverride ? (
                        <div>
                            <strong>{data.safety?.action}</strong> <br />
                            <span style={{ opacity: 0.8 }}>{data.safety?.reason}</span>
                        </div>
                    ) : (
                        <div>No emergency rules triggered</div>
                    )}
                </div>

                {/* Navigation Level */}
                <div style={{ color: !data.isOverride ? '#00bbff' : '#555', fontWeight: !data.isOverride ? 'bold' : 'normal' }}>
                    3. Waypoint Navigation {data.isOverride ? '(Skipped)' : '➔ ACTIVE'}
                </div>
                {!data.isOverride && (
                    <div style={{ marginLeft: '15px', color: '#00bbff', borderLeft: '1px solid #00bbff', paddingLeft: '8px' }}>
                        <div><strong>{data.action}</strong></div>
                        <div style={{ opacity: 0.8 }}>Steering to active waypoint...</div>
                    </div>
                )}
            </div>
        </div>
    );
}
