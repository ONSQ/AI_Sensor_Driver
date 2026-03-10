import useVehicleStore from '../../stores/useVehicleStore';
import useGameStore from '../../stores/useGameStore';
import { GRID, WORLD_HALF } from '../../constants/world';
import { VEHICLE_START } from '../../constants/vehicle';

export default function Minimap() {
    const position = useVehicleStore((s) => s.position);
    const storeHeading = useVehicleStore((s) => s.heading);
    const heading = (typeof storeHeading === 'number' && !Number.isNaN(storeHeading))
        ? storeHeading
        : VEHICLE_START.HEADING;
    const waypoints = useGameStore((s) => s.waypoints);
    const currentWaypointIndex = useGameStore((s) => s.currentWaypointIndex);

    // Constants
    const MINIMAP_SIZE = 250;
    const ZOOM_LEVEL = 1.5; // Scale factor for the world rendering
    const VIEW_RADIUS = MINIMAP_SIZE / 2 / ZOOM_LEVEL;

    // Render variables
    const vehicleX = position[0];
    const vehicleZ = position[2];

    // Create an array of active waypoints to draw the route line
    const activeWaypoints = waypoints.slice(currentWaypointIndex);

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                width: `${MINIMAP_SIZE}px`,
                height: `${MINIMAP_SIZE}px`,
                backgroundColor: '#f8f9fa',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '3px solid #e0e0e0',
                zIndex: 100,
                pointerEvents: 'none'
            }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`}
            >
                {/* World Container - Vehicle at center, rotated so forward = up (matches LiDAR) */}
                <g transform={`translate(${MINIMAP_SIZE / 2}, ${MINIMAP_SIZE / 2}) rotate(${heading * (180 / Math.PI)}) translate(${-vehicleX * ZOOM_LEVEL}, ${-vehicleZ * ZOOM_LEVEL})`}>

                    {/* Base Grid / Roads */}
                    <rect
                        x={-WORLD_HALF * ZOOM_LEVEL}
                        y={-WORLD_HALF * ZOOM_LEVEL}
                        width={GRID.WORLD_SIZE * ZOOM_LEVEL}
                        height={GRID.WORLD_SIZE * ZOOM_LEVEL}
                        fill="#e9ecef"
                    />

                    {/* Draw Blocks */}
                    {[0, 1, 2, 3].map((r) =>
                        [0, 1, 2, 3].map((c) => {
                            const cx = -WORLD_HALF + GRID.ROAD_WIDTH + GRID.BLOCK_SIZE / 2 + c * GRID.BLOCK_STRIDE;
                            const cz = -WORLD_HALF + GRID.ROAD_WIDTH + GRID.BLOCK_SIZE / 2 + r * GRID.BLOCK_STRIDE;
                            return (
                                <rect
                                    key={`block-${r}-${c}`}
                                    x={(cx - GRID.BLOCK_SIZE / 2) * ZOOM_LEVEL}
                                    y={(cz - GRID.BLOCK_SIZE / 2) * ZOOM_LEVEL}
                                    width={GRID.BLOCK_SIZE * ZOOM_LEVEL}
                                    height={GRID.BLOCK_SIZE * ZOOM_LEVEL}
                                    fill="#adb5bd"
                                    stroke="#868e96"
                                    strokeWidth="1.5"
                                    rx="4"
                                />
                            )
                        })
                    )}

                    {/* Draw the Route Line (Google Maps blue) */}
                    {activeWaypoints.length > 0 && (
                        <polyline
                            points={`
                ${vehicleX * ZOOM_LEVEL},${vehicleZ * ZOOM_LEVEL}
                ${activeWaypoints.map(wp => `${wp.position[0] * ZOOM_LEVEL},${wp.position[2] * ZOOM_LEVEL}`).join(' ')}
              `}
                            fill="none"
                            stroke="#4285F4"
                            strokeWidth="6"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            opacity="0.8"
                        />
                    )}

                    {/* Draw Waypoint Markers */}
                    {activeWaypoints.map((wp, i) => (
                        <circle
                            key={wp.id}
                            cx={wp.position[0] * ZOOM_LEVEL}
                            cy={wp.position[2] * ZOOM_LEVEL}
                            r={i === 0 ? "6" : "4"}
                            fill={i === 0 ? "#EA4335" : "#FBBC05"}
                            stroke="#fff"
                            strokeWidth="2"
                        />
                    ))}

                </g>

                {/* Vehicle Chevron - fixed at center, always points up (forward) */}
                <g transform={`translate(${MINIMAP_SIZE / 2}, ${MINIMAP_SIZE / 2})`}>
                    {/* View Cone (Points UP) */}
                    <path d="M-20 -40 L0 5 L20 -40 Z" fill="url(#coneGradient)" opacity="0.4" />

                    {/* Navigation Chevron (Points UP to -Y) */}
                    <path d="M-8 10 L0 -12 L8 10 L0 5 Z" fill="#4285F4" stroke="#fff" strokeWidth="1.5" />

                    <defs>
                        <linearGradient id="coneGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#4285F4" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#4285F4" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </g>
            </svg>
        </div>
    );
}
