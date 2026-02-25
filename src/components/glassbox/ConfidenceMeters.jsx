export default function ConfidenceMeters({ data }) {
    if (!data || !data.perception) return null;

    const { confidence, missingSensors, misclassified } = data.perception;

    return (
        <div style={{ marginTop: '15px' }}>
            <h3 style={{ fontSize: '12px', color: '#ff66aa', margin: '0 0 5px 0' }}>PERCEPTION CONFIDENCE</h3>

            <div style={{ background: '#111', height: '12px', width: '100%', marginBottom: '5px', position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, height: '100%',
                    width: `${confidence * 100}%`,
                    background: confidence > 0.8 ? '#00ff88' : confidence > 0.5 ? '#ffcc00' : '#ff4444',
                    transition: 'width 0.2s, background 0.2s'
                }} />
            </div>
            <div style={{ fontSize: '11px' }}>Total Confidence: {(confidence * 100).toFixed(1)}%</div>

            {missingSensors && missingSensors.length > 0 && (
                <div style={{ color: '#ffcc00', fontSize: '10px', marginTop: '4px' }}>
                    [WARNING] Sensors offline: {missingSensors.join(', ')}. Confidence degraded.
                </div>
            )}

            {misclassified && (
                <div style={{ color: '#ff4444', fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>
                    [ERROR] Misclassification detected!
                </div>
            )}
        </div>
    );
}
