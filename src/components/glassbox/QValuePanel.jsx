export default function QValuePanel({ data }) {
    if (!data || !data.decision || !data.decision.allScores) return null;

    const { decision, action, isOverride } = data;
    const scores = decision.allScores;

    return (
        <div style={{ marginTop: '10px' }}>
            <h3 style={{ fontSize: '12px', color: '#00bbff', margin: '0 0 5px 0' }}>
                ACTION VALUES {isOverride ? '(Safety Override Active)' : ''}
            </h3>

            <div style={{
                background: 'rgba(0,0,0,0.5)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid rgba(0,187,255,0.4)',
            }}>
                {scores.map((s) => {
                    const isChosen = s.action === (decision.chosenAction || action);
                    const barWidth = Math.max(5, Math.min(100, (s.score || 0) * 5));

                    return (
                        <div key={s.action} style={{ marginBottom: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: isChosen ? 'bold' : 'normal', color: isChosen ? '#00ff88' : '#ccc' }}>
                                    {s.action}
                                </span>
                                <span style={{ opacity: 0.8 }}>
                                    {(s.score ?? 0).toFixed(2)}
                                </span>
                            </div>
                            <div style={{
                                height: '6px',
                                width: '100%',
                                background: '#111',
                                position: 'relative',
                                borderRadius: '3px',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    height: '100%',
                                    width: `${barWidth}%`,
                                    background: isChosen ? '#00ff88' : '#00bbff',
                                    opacity: isOverride ? 0.4 : 0.9,
                                    transition: 'width 0.15s ease-out',
                                }} />
                            </div>
                        </div>
                    );
                })}

                <div style={{ marginTop: '6px', fontSize: '10px', opacity: 0.8 }}>
                    {isOverride
                        ? 'Safety rules chose the final action; values above show what the learned policy preferred.'
                        : 'The action with the highest value is chosen by the learned policy.'}
                </div>
            </div>
        </div>
    );
}

