import useAIStore from '../../stores/useAIStore.js';
import NarrationLog from './NarrationLog.jsx';
import ConfidenceMeters from './ConfidenceMeters.jsx';
import DecisionTree from './DecisionTree.jsx';
import SimulationControls from './SimulationControls.jsx';

export default function GlassBoxUI({ visible }) {
    const glassboxData = useAIStore((s) => s.glassboxData);

    if (!visible) return null;

    return (
        <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '320px',
            height: '100vh',
            backgroundColor: 'rgba(10, 15, 30, 0.95)',
            borderLeft: '1px solid rgba(0, 255, 136, 0.3)',
            color: '#00ff88',
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            padding: '15px',
            boxSizing: 'border-box',
            zIndex: 1000,
            overflowY: 'auto',
            boxShadow: '-5px 0 15px rgba(0,0,0,0.5)'
        }}>
            <h2 style={{ fontSize: '16px', margin: '0 0 15px 0', borderBottom: '1px solid #00ff88', paddingBottom: '8px' }}>
                🧠 AI GLASS BOX
            </h2>

            {!glassboxData ? (
                <div style={{ opacity: 0.5 }}>Initializing TensorFlow.js Perception...</div>
            ) : (
                <>
                    <SimulationControls />
                    <DecisionTree data={glassboxData} />
                    <ConfidenceMeters data={glassboxData} />
                    <NarrationLog />
                </>
            )}
        </div>
    );
}
