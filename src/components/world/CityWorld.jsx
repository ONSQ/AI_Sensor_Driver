// ============================================================
// CityWorld — Main world component
// Generates world data from seed, renders all blocks + roads.
// ============================================================

import { useMemo } from 'react';
import { generateWorld } from '../../systems/world/generateWorld.js';
import Ground from './Ground.jsx';
import Roads from './Roads.jsx';
import Block from './Block.jsx';

export default function CityWorld({ seed = 12345 }) {
  const worldData = useMemo(() => generateWorld(seed), [seed]);

  return (
    <group>
      <Ground />
      <Roads data={worldData.roads} />
      {worldData.blocks.map((block) => (
        <Block key={`${block.row}-${block.col}`} data={block} />
      ))}
    </group>
  );
}
