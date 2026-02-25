import useAIStore from '../../stores/useAIStore.js';

export default function NarrationLog() {
    const log = useAIStore(s => s.narrationLog);

    return (
        <div style={{ marginTop: '15px' }}>
            <h3 style={{ fontSize: '12px', color: '#88aaff', margin: '0 0 5px 0' }}>NARRATION LOG</h3>
            <div style={{
                height: '150px',
                overflowY: 'auto',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '5px',
                border: '1px solid #336699',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
            }}>
                {log.slice(0, 10).map((entry, i) => (
                    <div key={i} style={{ color: entry.isOverride ? '#ff4444' : '#00ff88' }}>
                        <span style={{ opacity: 0.6 }}>[{new Date(entry.timestamp).toISOString().substring(11, 23)}]</span>{' '}
                        {entry.isOverride ? `⚠️ SAFETY OVERRIDE: ${entry.action} — ${entry.reason}` :
                            `Action: ${entry.action} | Confidence: ${(entry.confidence * 100).toFixed(1)}%`
                        }
                    </div>
                ))}
            </div>
        </div>
    );
}
