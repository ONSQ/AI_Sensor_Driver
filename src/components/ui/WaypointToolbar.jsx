import React from 'react';
import useWaypointStore from '../../stores/useWaypointStore';

export default function WaypointToolbar() {
    const isDesignerMode = useWaypointStore((s) => s.isDesignerMode);
    const customWaypoints = useWaypointStore((s) => s.customWaypoints);
    const toggleDesignerMode = useWaypointStore((s) => s.toggleDesignerMode);
    const clearWaypoints = useWaypointStore((s) => s.clearWaypoints);

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            background: 'rgba(20, 25, 40, 0.9)',
            padding: '10px 20px',
            borderRadius: '20px',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            color: 'white',
            fontFamily: 'monospace',
            zIndex: 1000,
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            alignItems: 'center'
        }}>
            <h3 style={{ margin: 0, fontSize: '14px', marginRight: '15px' }}>📍 Waypoint Designer</h3>

            <button
                onClick={toggleDesignerMode}
                style={{
                    backgroundColor: isDesignerMode ? '#fbbf24' : '#4ade80',
                    color: '#000',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                }}
            >
                {isDesignerMode ? 'Exit Designer' : 'Enter Designer'}
            </button>

            {isDesignerMode && (
                <>
                    <div style={{ padding: '0 10px', fontSize: '12px', opacity: 0.8 }}>
                        Click paths to add waypoints ({customWaypoints.length})
                    </div>

                    <button
                        onClick={clearWaypoints}
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Clear Path
                    </button>
                </>
            )}
        </div>
    );
}
