import useAIStore from '../../stores/useAIStore.js';

export default function SimulationControls() {
    const { isPaused, timeScale, togglePause, setTimeScale, resetPlayback } = useAIStore();

    return (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '12px', color: '#ffcc00', margin: '0 0 10px 0' }}>SIMULATION CONTROLS</h3>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                <button onClick={togglePause} style={btnStyle}>{isPaused ? '▶ PLAY' : '⏸ PAUSE'}</button>
                <button onClick={resetPlayback} style={btnStyle}>⏹ RESET</button>
            </div>
            <div style={{ display: 'flex', gap: '5px', fontSize: '11px' }}>
                Speed:
                <button onClick={() => setTimeScale(0.25)} style={timeScale === 0.25 ? activeBtn : btnStyle}>0.25x</button>
                <button onClick={() => setTimeScale(0.5)} style={timeScale === 0.5 ? activeBtn : btnStyle}>0.5x</button>
                <button onClick={() => setTimeScale(1.0)} style={timeScale === 1.0 ? activeBtn : btnStyle}>1.0x</button>
            </div>
        </div>
    );
}

const btnStyle = {
    background: '#222',
    color: '#fff',
    border: '1px solid #555',
    cursor: 'pointer',
    padding: '4px 8px',
    fontFamily: 'monospace'
};

const activeBtn = {
    ...btnStyle,
    background: '#ffcc00',
    color: '#000',
    borderColor: '#ffcc00'
};
