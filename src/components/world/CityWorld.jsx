// ============================================================
// CityWorld — Main world component
// Generates world data from seed, renders all blocks + roads +
// traffic infrastructure + zone props.
// ============================================================

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { generateWorld } from '../../systems/world/generateWorld.js';
import useTrafficStore from '../../stores/useTrafficStore.js';
import Ground from './Ground.jsx';
import Roads from './Roads.jsx';
import Block from './Block.jsx';
import TrafficLight from './TrafficLight.jsx';
import StopSign from './StopSign.jsx';
import ZoneProps from './ZoneProps.jsx';

export default function CityWorld({ seed = 12345 }) {
  const worldData = useMemo(() => generateWorld(seed), [seed]);
  const tickTraffic = useTrafficStore((s) => s.tick);

  // Drive the traffic light clock every frame
  useFrame((_, delta) => {
    tickTraffic(delta);
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
    </group>
  );
}
