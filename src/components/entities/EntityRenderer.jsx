// ============================================================
// EntityRenderer — Subscribes to useEntityStore and renders
// each visible entity with its type-specific mesh component.
// ============================================================

import useEntityStore from '../../stores/useEntityStore.js';
import Pedestrian from './Pedestrian.jsx';
import NpcVehicle from './NpcVehicle.jsx';
import SchoolBus from './SchoolBus.jsx';
import EmergencyVehicle from './EmergencyVehicle.jsx';
import Animal from './Animal.jsx';
import Ball from './Ball.jsx';

const COMPONENT_MAP = {
  pedestrian: Pedestrian,
  npcVehicle: NpcVehicle,
  schoolbus: SchoolBus,
  emergency: EmergencyVehicle,
  animal: Animal,
  ball: Ball,
};

export default function EntityRenderer() {
  const entities = useEntityStore((s) => s.entities);

  return (
    <group>
      {entities
        .filter((e) => e.visible)
        .map((e) => {
          const Component = COMPONENT_MAP[e.type];
          if (!Component) return null;
          return <Component key={e.id} entity={e} />;
        })}
    </group>
  );
}
