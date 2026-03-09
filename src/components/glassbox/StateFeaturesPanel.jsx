export default function StateFeaturesPanel({ data }) {
    const worldState = data?.worldState;
    if (!worldState) return null;

    const ws = worldState;

    const distanceToObstacle = typeof ws.distanceToObstacle === 'number'
        ? ws.distanceToObstacle.toFixed(1)
        : '—';

    const speed = typeof ws.speed === 'number' ? ws.speed.toFixed(1) : '—';
    const speedLimit = typeof ws.speedLimit === 'number' ? ws.speedLimit.toFixed(1) : '—';

    let speedRatio = 0;
    if (typeof ws.speed === 'number' && typeof ws.speedLimit === 'number' && ws.speedLimit > 0) {
        speedRatio = Math.min(2, Math.max(0, ws.speed / ws.speedLimit));
    }

    const zoneLabel = ws.zoneIsSchool ? 'SCHOOL' : 'OTHER';

    const visibility = typeof ws.visibility === 'number'
        ? Math.round(ws.visibility * 100)
        : 100;

    const pedestriansNearby = typeof ws.pedestriansNearby === 'number'
        ? ws.pedestriansNearby
        : (ws.pedestrianInCrosswalk ? 1 : 0);

    let waypointDir = 'STRAIGHT';
    if (ws.alignedWithWaypoint === false) {
        if (ws.targetDirection === 'LEFT') waypointDir = 'LEFT';
        if (ws.targetDirection === 'RIGHT') waypointDir = 'RIGHT';
    }

    return (
        <div style={{ marginTop: '15px' }}>
            <h3 style={{ fontSize: '12px', color: '#66ffcc', margin: '0 0 5px 0' }}>RL STATE FEATURES</h3>
            <div style={{
                background: 'rgba(0,0,0,0.5)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid rgba(102,255,204,0.4)',
            }}>
                <div>Distance ahead: <strong>{distanceToObstacle} m</strong></div>
                <div>Waypoint direction: <strong>{waypointDir}</strong></div>
                <div>Speed: <strong>{speed}</strong> m/s (limit <strong>{speedLimit}</strong> m/s)</div>
                <div>Speed ratio: <strong>{speedRatio.toFixed(2)}</strong></div>
                <div>Zone: <strong>{zoneLabel}</strong></div>
                <div>Visibility: <strong>{visibility}%</strong></div>
                <div>Pedestrian in lane: <strong>{ws.pedestrianInMyPath ? 'YES' : 'NO'}</strong></div>
                <div>Pedestrians nearby: <strong>{pedestriansNearby}</strong></div>
                <div>Red light / stop ahead: <strong>{ws.approachingRedLight || ws.approachingStopSign ? 'YES' : 'NO'}</strong></div>
            </div>
        </div>
    );
}

