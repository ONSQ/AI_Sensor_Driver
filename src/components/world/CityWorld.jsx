// ============================================================
// CityWorld — Main world component
// Generates world data from seed, renders all blocks + roads +
// traffic infrastructure + zone props.
// ============================================================

import { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { generateWorld } from '../../systems/world/generateWorld.js';
import { generateWaypoints, WAYPOINT_REACH_RADIUS } from '../../systems/waypoints/generateWaypoints.js';
import useTrafficStore from '../../stores/useTrafficStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import useGameStore from '../../stores/useGameStore.js';
import { tickVehiclePhysics } from '../../systems/vehicle/vehiclePhysics.js';
import { buildCollisionData, resolveCollisions } from '../../systems/vehicle/collisions.js';
import { buildSensorTargets } from '../../systems/sensors/sensorTargets.js';
import Ground from './Ground.jsx';
import Roads from './Roads.jsx';
import Block from './Block.jsx';
import TrafficLight from './TrafficLight.jsx';
import StopSign from './StopSign.jsx';
import ZoneProps from './ZoneProps.jsx';
import WaypointMarker from './WaypointMarker.jsx';
import SensorManager from '../sensors/SensorManager.jsx';
import Vehicle from '../vehicle/Vehicle.jsx';
import useEntityStore from '../../stores/useEntityStore.js';
import EntityRenderer from '../entities/EntityRenderer.jsx';

export default function CityWorld({ seed = 12345, cameraMode = 'orbit' }) {
  const worldData = useMemo(() => generateWorld(seed), [seed]);
  const collisionData = useMemo(() => buildCollisionData(worldData), [worldData]);
  const sensorTargets = useMemo(() => buildSensorTargets(worldData), [worldData]);
  const tickTraffic = useTrafficStore((s) => s.tick);

  // Initialize entities from seed (once per seed + worldData)
  useEffect(() => {
    useEntityStore.getState().initEntities(seed, worldData);
  }, [seed, worldData]);

  // Attach dynamic entity getter to collisionData for entity-vehicle collisions
  useMemo(() => {
    collisionData.entityGetter = () => useEntityStore.getState().entities;
  }, [collisionData]);

  // Generate waypoints once per seed
  const waypointData = useMemo(() => {
    const startPos = useVehicleStore.getState().position;
    return generateWaypoints(seed, startPos);
  }, [seed]);

  // Push waypoints into game store when they change
  useEffect(() => {
    useGameStore.getState().setWaypoints(waypointData);
  }, [waypointData]);

  // Subscribe to waypoint state for rendering
  const waypoints = useGameStore((s) => s.waypoints);
  const currentWaypointIndex = useGameStore((s) => s.currentWaypointIndex);

  // Drive the traffic light clock + vehicle physics + collision every frame
  useFrame((_, delta) => {
    tickTraffic(delta);

    // Entity behavior tick (pedestrians, NPC vehicles, animals, etc.)
    const vPos = useVehicleStore.getState().position;
    useEntityStore.getState().tick(delta, useTrafficStore.getState(), vPos);

    // Vehicle physics tick → collision resolution → scoring
    const vState = useVehicleStore.getState();
    const candidateState = tickVehiclePhysics(vState, vState.inputs, delta);
    const { state: correctedState, scoreDelta } = resolveCollisions(candidateState, collisionData);
    vState.applyPhysicsState(correctedState);
    if (scoreDelta !== 0) {
      useGameStore.getState().addScore(scoreDelta);
    }

    // Waypoint proximity check
    const gameState = useGameStore.getState();
    const { waypoints: wps, currentWaypointIndex: wpIdx } = gameState;
    if (wpIdx < wps.length) {
      const wp = wps[wpIdx];
      if (wp && !wp.reached) {
        const [vx2, , vz2] = correctedState.position;
        const dx = vx2 - wp.position[0];
        const dz = vz2 - wp.position[2];
        if (dx * dx + dz * dz < WAYPOINT_REACH_RADIUS * WAYPOINT_REACH_RADIUS) {
          gameState.advanceWaypoint();
        }
      }
    }
  });

  return (
    <group>
      <Ground />
      <Roads data={worldData.roads} />

      {/* City blocks: buildings + zone props */}
      {worldData.blocks.map((block) => (
        <group key={`block-${block.row}-${block.col}`}>
          <Block data={block} />
          <ZoneProps props={block.props} />
        </group>
      ))}

      {/* Traffic lights at interior intersections */}
      {worldData.trafficLights.map((light) => (
        <TrafficLight
          key={light.id}
          position={light.position}
          rotation={light.rotation}
          axis={light.axis}
        />
      ))}

      {/* Stop signs at perimeter intersections */}
      {worldData.stopSigns.map((sign) => (
        <StopSign
          key={sign.id}
          position={sign.position}
          rotation={sign.rotation}
        />
      ))}

      {/* Colored road lines for school (yellow) and hospital (red) zones */}
      {worldData.zoneRoadLines.map((line, i) => (
        <mesh
          key={`zrl-${i}`}
          position={[line.position[0], line.position[1], line.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[line.width, line.length]} />
          <meshStandardMaterial color={line.color} />
        </mesh>
      ))}

      {/* Navigation waypoints */}
      {waypoints.map((wp, i) => (
        <WaypointMarker
          key={`wp-${wp.id}`}
          position={wp.position}
          active={i === currentWaypointIndex}
          reached={wp.reached}
          index={i}
        />
      ))}

      {/* Animated entities (pedestrians, NPC vehicles, animals, etc.) */}
      <EntityRenderer />

      {/* Sensor systems (LiDAR renders in scene; others use HTML overlays) */}
      <SensorManager sensorTargets={sensorTargets} collisionData={collisionData} />

      {/* Player vehicle (visible in orbit + third-person, hidden in first-person) */}
      <Vehicle visible={cameraMode !== 'first-person'} />
    </group>
  );
}
