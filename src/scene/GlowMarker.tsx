// 操作できるものの足元でゆっくり明滅する光の輪（文字を使わない案内）

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  position: [number, number, number];
  color?: string;
  radius?: number;
  speed?: number;
}

export function GlowMarker({ position, color = '#ffe3a1', radius = 1.2, speed = 2 }: Props) {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase.current;
    const s = 1 + Math.sin(t) * 0.12;
    ring.current?.scale.set(s, s, s);
    if (mat.current) mat.current.opacity = 0.45 + Math.sin(t) * 0.25;
  });

  return (
    <mesh ref={ring} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.78, radius, 40]} />
      <meshBasicMaterial ref={mat} color={color} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
