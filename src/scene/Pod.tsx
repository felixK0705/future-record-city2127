// 自動運転ポッドの乗り場と、乗車中に移動するポッド

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STATIONS } from '../game/cityData';
import { runtime } from '../game/runtime';
import { useGame } from '../game/store';
import { GEO, glow, lambert } from './geometries';
import { GlowMarker } from './GlowMarker';

/** ポッド本体の形（前が +z） */
export function PodShape({ color = '#f4f6fa' }: { color?: string }) {
  const body = lambert(color);
  return (
    <group>
      <mesh geometry={GEO.roundedBox} material={body} position={[0, 0.72, 0]} rotation={[0, Math.PI / 2, 0]} scale={[2.6, 0.9, 1.5]} castShadow />
      <mesh geometry={GEO.sphere} material={body} position={[0, 0.72, 1.1]} scale={[1.5, 0.9, 0.7]} castShadow />
      <mesh geometry={GEO.sphere} material={body} position={[0, 0.72, -1.1]} scale={[1.5, 0.9, 0.7]} castShadow />
      <mesh geometry={GEO.hemisphere} material={lambert('#3e5f82')} position={[0, 1.12, 0.15]} scale={[1.35, 1.0, 2.1]} castShadow />
      <mesh geometry={GEO.box} material={glow('#7fe0ff')} position={[0, 0.62, 0]} scale={[1.52, 0.06, 2.4]} />
      <mesh geometry={GEO.box} material={glow('#fff6d8')} position={[0, 0.8, 1.44]} scale={[0.9, 0.08, 0.04]} />
      <mesh geometry={GEO.box} material={glow('#ff5a4a')} position={[0, 0.8, -1.44]} scale={[0.9, 0.08, 0.04]} />
      {[-0.62, 0.62].flatMap((x) =>
        [-0.85, 0.85].map((z) => (
          <mesh key={`${x}:${z}`} geometry={GEO.wheel} material={lambert('#23262c')} position={[x, 0.26, z]} scale={[0.18, 0.46, 0.46]} />
        )),
      )}
    </group>
  );
}

function StationView({ x, z }: { x: number; z: number }) {
  const pod = useRef<THREE.Group>(null);
  const phase = useGame((s) => s.phase);
  const offset = useRef(Math.random() * 10);
  useFrame(({ clock }) => {
    if (pod.current) pod.current.position.y = 0.12 + Math.sin(clock.elapsedTime * 1.6 + offset.current) * 0.05;
  });
  const post = lambert('#9aa6b4');
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={GEO.cylinder} material={lambert('#dfe6ee')} position={[0, 0.06, 0]} scale={[3.6, 0.12, 3.6]} receiveShadow />
      <mesh geometry={GEO.ring} material={glow('#8fe6ff')} position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[3.4, 3.4, 1]} />
      {/* 屋根付きの待合 */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={GEO.cylinder} material={post} position={[-1.7, 1.3, sz * 0.9]} scale={[0.1, 2.6, 0.1]} castShadow />
      ))}
      <mesh geometry={GEO.box} material={lambert('#b9d6ea')} position={[-1.35, 2.65, 0]} scale={[1.2, 0.08, 2.3]} castShadow />
      <mesh geometry={GEO.box} material={lambert('#8e9cab')} position={[-1.5, 0.45, 0]} scale={[0.5, 0.08, 1.6]} />
      {/* 案内板 */}
      <mesh geometry={GEO.box} material={lambert('#2b3440')} position={[-1.75, 1.8, 0]} scale={[0.1, 0.7, 1.1]} />
      <mesh geometry={GEO.box} material={glow('#8fe6ff')} position={[-1.69, 1.8, 0]} scale={[0.02, 0.5, 0.9]} />
      <group ref={pod} position={[0.5, 0.12, 0]} scale={0.8}>
        <PodShape />
      </group>
      {phase === 'playing' && <GlowMarker position={[0, 0.16, 0]} radius={2.4} color="#8fe6ff" speed={1.6} />}
    </group>
  );
}

/** 乗車中のポッド（プレイヤーの位置を追う） */
function RidePod() {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const r = runtime.ride;
    const group = g.current;
    if (!group) return;
    group.visible = r !== null;
    if (!r) return;
    const lift = Math.sin(Math.PI * r.t) * 3.5;
    group.position.set(runtime.player.x, lift, runtime.player.z);
    group.rotation.y = runtime.player.heading;
  });
  return (
    <group ref={g} visible={false}>
      <PodShape color="#ffffff" />
    </group>
  );
}

export function Pods() {
  const future = useGame((s) => s.future);
  if (future) return null;
  return (
    <group>
      {STATIONS.map((s) => (
        <StationView key={s.id} x={s.x} z={s.z} />
      ))}
      <RidePod />
    </group>
  );
}
