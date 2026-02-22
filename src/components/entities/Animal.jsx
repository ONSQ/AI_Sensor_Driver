import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const ANIMAL_PROPS = {
  dog: {
    body: [0.25, 0.25, 0.6],  // w, h, d
    leg: [0.08, 0.25, 0.08],
    headCoords: [0.15, 0.15, 0.2], // w, h, d
    headOffset: [0, 0.2, 0.35],
    legPos: { // pivots relative to body center
      fl: [0.1, -0.125, 0.2],
      fr: [-0.1, -0.125, 0.2],
      bl: [0.1, -0.125, -0.15],
      br: [-0.1, -0.125, -0.15],
    }
  },
  deer: {
    body: [0.35, 0.4, 1.0],
    leg: [0.1, 0.8, 0.1],
    headCoords: [0.2, 0.2, 0.3], // w,h,d
    headOffset: [0, 0.5, 0.6],
    legPos: {
      fl: [0.12, -0.2, 0.35],
      fr: [-0.12, -0.2, 0.35],
      bl: [0.12, -0.2, -0.35],
      br: [-0.12, -0.2, -0.35],
    }
  }
};

export default function Animal({ entity }) {
  const groupRef = useRef();
  const flRef = useRef();
  const frRef = useRef();
  const blRef = useRef();
  const brRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.set(entity.position[0], entity.position[1], entity.position[2]);
      groupRef.current.rotation.set(0, entity.heading, 0);
    }

    // Animate legs if moving
    if (entity.speed > 0) {
      const t = clock.getElapsedTime() * entity.speed * 4;
      const swing = Math.sin(t) * 0.5;

      // Opposite legs swing together: FL and BR together, FR and BL together
      if (flRef.current) flRef.current.rotation.x = swing;
      if (brRef.current) brRef.current.rotation.x = swing;
      if (frRef.current) frRef.current.rotation.x = -swing;
      if (blRef.current) blRef.current.rotation.x = -swing;
    } else {
      if (flRef.current) flRef.current.rotation.x = 0;
      if (brRef.current) brRef.current.rotation.x = 0;
      if (frRef.current) frRef.current.rotation.x = 0;
      if (blRef.current) blRef.current.rotation.x = 0;
    }
  });

  const props = ANIMAL_PROPS[entity.subtype] || ANIMAL_PROPS.dog;

  const legH = props.leg[1];
  const bodyY = legH + props.body[1] / 2;

  return (
    <group ref={groupRef}>
      <group position={[0, bodyY, 0]}>
        {/* Body */}
        <mesh castShadow>
          <boxGeometry args={props.body} />
          <meshStandardMaterial color={entity.color} />
        </mesh>

        {/* Head */}
        <mesh position={props.headOffset} castShadow>
          <boxGeometry args={props.headCoords} />
          <meshStandardMaterial color={entity.color} />
        </mesh>

        {/* Front Left Leg */}
        <group position={props.legPos.fl} ref={flRef}>
          <mesh position={[0, -legH / 2, 0]} castShadow>
            <boxGeometry args={props.leg} />
            <meshStandardMaterial color={entity.color} />
          </mesh>
        </group>

        {/* Front Right Leg */}
        <group position={props.legPos.fr} ref={frRef}>
          <mesh position={[0, -legH / 2, 0]} castShadow>
            <boxGeometry args={props.leg} />
            <meshStandardMaterial color={entity.color} />
          </mesh>
        </group>

        {/* Back Left Leg */}
        <group position={props.legPos.bl} ref={blRef}>
          <mesh position={[0, -legH / 2, 0]} castShadow>
            <boxGeometry args={props.leg} />
            <meshStandardMaterial color={entity.color} />
          </mesh>
        </group>

        {/* Back Right Leg */}
        <group position={props.legPos.br} ref={brRef}>
          <mesh position={[0, -legH / 2, 0]} castShadow>
            <boxGeometry args={props.leg} />
            <meshStandardMaterial color={entity.color} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
