// 人の形：胴・頭・髪・手足を組み合わせ、歩くと手足が振れる

import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, lambert } from './geometries';

export type HairStyle = 'short' | 'long' | 'bun' | 'cap' | 'gray' | 'bob';
export type Accessory = 'cane' | 'briefcase' | 'randoseru' | 'backpack' | 'bag' | 'none';

export interface HumanoidLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  shoes: string;
  /** 全体の大きさ（子どもは小さく） */
  scale?: number;
  /** 腰が少し曲がっている */
  stoop?: boolean;
  accessory?: Accessory;
  /** ネクタイ・スカーフなどの差し色 */
  accent?: string;
  /** 首元のスカーフ（プレイヤー） */
  scarf?: boolean;
}

export interface HumanoidMotion {
  /** 移動の速さ（m/秒） */
  speed: number;
  sitting?: boolean;
}

interface Props {
  look: HumanoidLook;
  motion: MutableRefObject<HumanoidMotion>;
  castShadow?: boolean;
}

const EYE = '#2b2a33';

export function Humanoid({ look, motion, castShadow = true }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * 6);
  const swing = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const m = motion.current;
    const moving = Math.min(1, m.speed / 3.5);
    swing.current += (moving - swing.current) * (1 - Math.exp(-dt * 10));
    phase.current += dt * (4 + m.speed * 1.3);
    const s = Math.sin(phase.current);
    const amp = swing.current;

    if (m.sitting) {
      if (legL.current) legL.current.rotation.x = -Math.PI / 2 + 0.1;
      if (legR.current) legR.current.rotation.x = -Math.PI / 2 + 0.1;
      if (armL.current) armL.current.rotation.x = -0.5;
      if (armR.current) armR.current.rotation.x = -0.5;
      if (body.current) body.current.position.y = -0.45;
      return;
    }
    if (legL.current) legL.current.rotation.x = s * 0.7 * amp;
    if (legR.current) legR.current.rotation.x = -s * 0.7 * amp;
    // 杖をつく腕は大きく振らない
    const armAmp = look.accessory === 'cane' ? 0.2 : 0.6;
    if (armL.current) armL.current.rotation.x = -s * armAmp * amp;
    if (armR.current) armR.current.rotation.x = s * armAmp * amp + (look.accessory === 'cane' ? -0.25 : 0);
    if (body.current) body.current.position.y = Math.abs(Math.cos(phase.current)) * 0.06 * amp;
    if (root.current) root.current.rotation.z = s * 0.03 * amp;
  });

  const k = look.scale ?? 1;
  const stoop = look.stoop ? 0.22 : 0;
  const skin = lambert(look.skin);
  const hair = lambert(look.hair);
  const top = lambert(look.top);
  const bottom = lambert(look.bottom);
  const shoes = lambert(look.shoes);
  const headK = k < 0.9 ? 1.18 : 1;

  return (
    <group ref={root} scale={k}>
      <group ref={body}>
        {/* 脚 */}
        {[
          [legL, -0.12],
          [legR, 0.12],
        ].map(([ref, x]) => (
          <group key={x as number} ref={ref as MutableRefObject<THREE.Group>} position={[x as number, 0.9, 0]}>
            <mesh geometry={GEO.limb} material={bottom} position={[0, -0.42, 0]} scale={[0.19, 0.4, 0.19]} castShadow={castShadow} />
            <mesh geometry={GEO.box} material={shoes} position={[0, -0.84, 0.05]} scale={[0.17, 0.1, 0.28]} />
          </group>
        ))}

        {/* 腰 */}
        <mesh geometry={GEO.roundedBox} material={bottom} position={[0, 0.93, 0]} scale={[0.44, 0.26, 0.28]} castShadow={castShadow} />

        <group rotation={[stoop, 0, 0]} position={[0, 0.9, 0]}>
          {/* 胴 */}
          <mesh geometry={GEO.torso} material={top} position={[0, 0.32, 0]} scale={[0.46, 0.42, 0.3]} castShadow={castShadow} />
          {look.accent && !look.scarf && (
            <mesh geometry={GEO.box} material={lambert(look.accent)} position={[0, 0.42, 0.14]} scale={[0.07, 0.3, 0.04]} />
          )}
          {look.scarf && (
            <mesh geometry={GEO.ring} material={lambert(look.accent ?? '#ff8f4a')} position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.52, 0.52, 1.6]} />
          )}
          {/* 背中の荷物 */}
          {look.accessory === 'randoseru' && (
            <mesh geometry={GEO.roundedBox} material={lambert('#c8322d')} position={[0, 0.36, -0.22]} scale={[0.38, 0.42, 0.2]} castShadow={castShadow} />
          )}
          {look.accessory === 'backpack' && (
            <mesh geometry={GEO.roundedBox} material={lambert('#3f5f8a')} position={[0, 0.34, -0.22]} scale={[0.36, 0.44, 0.2]} castShadow={castShadow} />
          )}

          {/* 腕 */}
          {[
            [armL, -0.28],
            [armR, 0.28],
          ].map(([ref, x]) => (
            <group key={x as number} ref={ref as MutableRefObject<THREE.Group>} position={[x as number, 0.58, 0]}>
              <mesh geometry={GEO.limb} material={top} position={[0, -0.27, 0]} scale={[0.13, 0.22, 0.13]} />
              <mesh geometry={GEO.sphereLow} material={skin} position={[0, -0.55, 0]} scale={0.13} />
              {x === 0.28 && look.accessory === 'cane' && (
                <mesh geometry={GEO.cylinderLow} material={lambert('#6b4a33')} position={[0, -0.95, 0.12]} scale={[0.05, 0.85, 0.05]} />
              )}
              {x === -0.28 && look.accessory === 'briefcase' && (
                <mesh geometry={GEO.box} material={lambert('#2d2f36')} position={[0, -0.72, 0]} scale={[0.1, 0.3, 0.42]} />
              )}
              {x === -0.28 && look.accessory === 'bag' && (
                <mesh geometry={GEO.roundedBox} material={lambert('#b8864f')} position={[0, -0.7, 0]} scale={[0.12, 0.28, 0.36]} />
              )}
            </group>
          ))}

          {/* 頭 */}
          <group position={[0, 0.84, 0.02]} scale={headK}>
            <mesh geometry={GEO.sphere} material={skin} scale={[0.34, 0.36, 0.33]} castShadow={castShadow} />
            <mesh geometry={GEO.sphereLow} material={lambert(EYE)} position={[-0.065, 0.02, 0.155]} scale={0.045} />
            <mesh geometry={GEO.sphereLow} material={lambert(EYE)} position={[0.065, 0.02, 0.155]} scale={0.045} />
            <mesh geometry={GEO.sphereLow} material={lambert(look.skin)} position={[0, -0.03, 0.17]} scale={[0.04, 0.05, 0.04]} />
            {/* 髪型 */}
            {look.hairStyle !== 'cap' && (
              <mesh geometry={GEO.hemisphere} material={hair} position={[0, 0.02, -0.01]} scale={[0.37, 0.38, 0.36]} rotation={[-0.25, 0, 0]} />
            )}
            {(look.hairStyle === 'long' || look.hairStyle === 'bob') && (
              <mesh
                geometry={GEO.roundedBox}
                material={hair}
                position={[0, look.hairStyle === 'long' ? -0.12 : -0.04, -0.09]}
                scale={[0.36, look.hairStyle === 'long' ? 0.38 : 0.22, 0.2]}
              />
            )}
            {look.hairStyle === 'bun' && <mesh geometry={GEO.sphereLow} material={hair} position={[0, 0.16, -0.14]} scale={0.16} />}
            {look.hairStyle === 'cap' && (
              <>
                <mesh geometry={GEO.hemisphere} material={lambert(look.accent ?? '#3f7fc4')} position={[0, 0.04, 0]} scale={[0.37, 0.34, 0.37]} />
                <mesh geometry={GEO.box} material={lambert(look.accent ?? '#3f7fc4')} position={[0, 0.05, 0.2]} scale={[0.26, 0.03, 0.16]} />
              </>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}
