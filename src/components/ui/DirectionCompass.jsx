import { useEffect, useState } from 'react';
import useVehicleStore from '../../stores/useVehicleStore.js';

/**
 * Poll vehicle store at ~15fps for compass updates.
 */
function useCompassHeading() {
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setHeading(useVehicleStore.getState().heading || 0);
        }, 66); // ~15fps

        return () => clearInterval(interval);
    }, []);

    return heading;
}

export default function DirectionCompass({ visible = true }) {
    const rawHeading = useCompassHeading();

    if (!visible) return null;

    // heading=0 is North (-Z)
    // heading=Math.PI/2 is West (-X)
    // heading=-Math.PI/2 is East (+X)
    // heading=Math.PI is South (+Z)
    // We want standard degrees: 0=N, 90=E, 180=S, 270=W
    const standardDeg = ((-rawHeading * 180) / Math.PI + 360) % 360;

    // Find the closest cardinal/ordinal text
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(standardDeg / 45) % 8;
    const compassText = directions[index];

    return (
        <div style={styles.container}>
            <div style={styles.compassBox}>
                <div style={styles.label}>HEADING</div>
                <div style={styles.value}>
                    {compassText}
                    <span style={styles.degrees}>{Math.round(standardDeg)}°</span>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        fontFamily: 'monospace',
        userSelect: 'none',
    },
    compassBox: {
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        borderRadius: '8px',
        padding: '8px 16px',
        textAlign: 'center',
    },
    label: {
        fontSize: '10px',
        color: '#888',
        letterSpacing: '1px',
        marginBottom: '2px',
    },
    value: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#00ff88',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '8px',
    },
    degrees: {
        fontSize: '14px',
        color: '#ccc',
    }
};
