// ============================================================
// CityWorld — Main world component
// Generates world data from seed, renders all blocks + roads +
// traffic infrastructure + zone props.
// ============================================================

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { generateWorld } from '../../systems/world/generateWorld.js';
import useTrafficStore from '../../stores/useTrafficStore.js';
import useVehicleStore from '../../stores/useVehicleStore.js';
import { tickVehiclePhysics } from '../../systems/vehicle/vehiclePhysics.js';
import Ground from './Ground.jsx';
import Roads from './Roads.jsx';
import Block from './Block.jsx';
import TrafficLight from './TrafficLight.jsx';
import StopSign from './StopSign.jsx';
import ZoneProps from './ZoneProps.jsx';
import Vehicle from '../vehicle/Vehicle.jsx';

export default function CityWorld({ seed = 12345, cameraMode = 'orbit' }) {
  const worldData = useMemo(() => generateWorld(seed), [seed]);
  const tickTraffic = useTrafficStore((s) => s.tick);

  // Drive the traffic light clock + vehicle physics every frame
  useFrame((_, delta) => {
    tickTraffic(delta);

    // Vehicle physics tick
    const vState = useVehicleStore.getState();
    const newState = tickVehiclePhysics(vState, vState.inputs, delta);
    vState.applyPhysicsState(newState);
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

      {/* Player vehicle (visible in orbit + third-person, hidden in first-person) */}
      <Vehicle visible={cameraMode !== 'first-person'} />
    </group>
  );
}
