// 2027年の街：地面・道路・建物・木・街の小物・時計塔・AI端末。
// 建物や小物は部品ごとの InstancedMesh にまとめて描画する。

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ENDING_MAP } from '../data/endings';
import { ZONES } from '../data/zones';
import { BUSHES, CLOCK_TOWER, HEAT_PATCHES, ROAD, TERMINALS } from '../game/cityData';
import { useGame } from '../game/store';
import { CITY_PARTS, PROP_PARTS, TREE_PARTS, WIRE_POINTS } from './cityParts';
import { GEO, glow, lambert } from './geometries';
import { GlowMarker } from './GlowMarker';
import { Instanced, type InstanceSpec } from './Instanced';
import { Traffic } from './Traffic';

const spec = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, ry = 0): InstanceSpec => ({
  x,
  y,
  z,
  sx,
  sy,
  sz,
  color,
  ry,
});

// ---- 路面のしるし ----
const roadMarkSpecs: InstanceSpec[] = (() => {
  const out: InstanceSpec[] = [];
  for (let x = -60; x < 60; x += 6) out.push(spec(x, 0.035, 24.5, 3, 0.02, 0.16, '#e8e8e0'));
  out.push(spec(0, 0.035, 27.35, 124, 0.02, 0.12, '#e6c14a'));
  out.push(spec(0, 0.035, 27.65, 124, 0.02, 0.12, '#e6c14a'));
  out.push(spec(0, 0.035, 21.4, 124, 0.02, 0.12, '#f0f0ea'));
  out.push(spec(0, 0.035, 30.6, 124, 0.02, 0.12, '#f0f0ea'));
  for (const cx of [-30, 0, 30]) {
    for (let x = cx - 1.8; x <= cx + 1.8; x += 0.9) out.push(spec(x, 0.04, 26, 0.5, 0.02, 9.6, '#f4f4ee'));
  }
  // 住宅街の生活道路の外側線
  out.push(spec(-26.2, 0.035, -21, 0.12, 0.02, 78, '#f0f0ea'));
  out.push(spec(-19.8, 0.035, -21, 0.12, 0.02, 78, '#f0f0ea'));
  return out;
})();

// ---- 縁石 ----
const curbSpecs: InstanceSpec[] = [
  spec(0, 0.08, ROAD.minZ - 0.1, 124, 0.16, 0.25, '#c9c6bd'),
  spec(0, 0.08, ROAD.maxZ + 0.1, 124, 0.16, 0.25, '#c9c6bd'),
];

// ---- 広場のタイル ----
const plazaTileSpecs: InstanceSpec[] = (() => {
  const out: InstanceSpec[] = [];
  const colors = ['#e6d6bf', '#dccab0', '#efe2cc', '#e2cfb4'];
  let i = 0;
  for (let x = -17; x <= 17; x += 2) {
    for (let z = -17; z <= 17; z += 2) {
      i++;
      if (Math.abs(x) < 4.5 && Math.abs(z) < 4.5) continue;
      // 中央から放射状に色を変える
      const ring = Math.floor(Math.hypot(x, z) / 4);
      out.push(spec(x, 0.02, z, 1.9, 0.04, 1.9, ring % 3 === 0 ? '#d3bfa2' : colors[(i * 7) % colors.length]));
    }
  }
  return out;
})();

// ---- 商店街の石畳 ----
const shopPavingSpecs: InstanceSpec[] = (() => {
  const out: InstanceSpec[] = [];
  for (let z = -59; z <= 16; z += 1.5) {
    out.push(spec(39, 0.02, z, 9.6, 0.03, 1.4, Math.round(z / 1.5) % 2 ? '#c9b49a' : '#bfa98e'));
  }
  return out;
})();

// ---- 地面 ----
function Ground() {
  const future = useGame((s) => s.future);
  const endingId = useGame((s) => s.result?.endingId);
  const tint = future && endingId ? ENDING_MAP[endingId].groundTint : null;
  const zoneColor = (c: string) => (tint ? new THREE.Color(c).lerp(new THREE.Color(tint), 0.6) : new THREE.Color(c));

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[520, 520]} />
        <meshLambertMaterial color={zoneColor('#8f9c7c')} />
      </mesh>
      {/* 北側の通り */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -40]} receiveShadow>
        <planeGeometry args={[36, 44]} />
        <meshLambertMaterial color={zoneColor('#b9b3a8')} />
      </mesh>
      {ZONES.map((z) => {
        const [x0, z0, x1, z1] = z.rect;
        return (
          <mesh key={z.id} rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} receiveShadow>
            <planeGeometry args={[x1 - x0, z1 - z0]} />
            <meshLambertMaterial color={zoneColor(z.id === 'avenue' ? '#b3aea4' : z.groundColor)} />
          </mesh>
        );
      })}
      {/* 車道と住宅街の生活道路 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, (ROAD.minZ + ROAD.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[124, ROAD.maxZ - ROAD.minZ]} />
        <meshLambertMaterial color={future ? zoneColor('#6f8f63') : '#44464e'} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-23, 0.012, -21]} receiveShadow>
        <planeGeometry args={[7, 78]} />
        <meshLambertMaterial color={zoneColor('#6e7076')} />
      </mesh>
      <Instanced specs={plazaTileSpecs} tint={tint} tintAmount={0.5} castShadow={false}>
        <boxGeometry />
      </Instanced>
      <Instanced specs={shopPavingSpecs} tint={tint} tintAmount={0.5} castShadow={false}>
        <boxGeometry />
      </Instanced>
      <Instanced specs={curbSpecs} castShadow={false}>
        <boxGeometry />
      </Instanced>
      {!future && (
        <Instanced specs={roadMarkSpecs} unlit>
          <boxGeometry />
        </Instanced>
      )}
    </group>
  );
}

// ---- 照り返し（広場の日なた） ----
function HeatPatches() {
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame(({ clock }) => {
    mats.current.forEach((m, i) => {
      if (m) m.opacity = 0.14 + Math.sin(clock.elapsedTime * 2.2 + i * 1.7) * 0.07;
    });
  });
  return (
    <group>
      {HEAT_PATCHES.map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, z]}>
          <circleGeometry args={[3.2, 28]} />
          <meshBasicMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            color="#ffb259"
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---- 時計塔 ----
const TICKS: InstanceSpec[] = (() => {
  const out: InstanceSpec[] = [];
  const { size, height } = CLOCK_TOWER;
  const cy = height - 1.4;
  for (let f = 0; f < 4; f++) {
    const yaw = (f * Math.PI) / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const lx = Math.sin(a) * 1.2;
      const ly = Math.cos(a) * 1.2;
      const lz = size / 2 + 0.18;
      out.push({
        x: lx * Math.cos(yaw) + lz * Math.sin(yaw),
        y: cy + ly,
        z: -lx * Math.sin(yaw) + lz * Math.cos(yaw),
        sx: i % 3 === 0 ? 0.12 : 0.07,
        sy: i % 3 === 0 ? 0.32 : 0.18,
        sz: 0.04,
        ry: yaw,
        rz: -a,
        color: '#3a3226',
      });
    }
  }
  return out;
})();

function ClockTower() {
  const hands = useRef<(THREE.Group | null)[]>([]);
  const phase = useGame((s) => s.phase);
  const future = useGame((s) => s.future);
  useFrame((_, dt) => {
    hands.current.forEach((h, i) => {
      if (!h) return;
      const speed = future ? 0.05 : 0.4;
      h.rotation.z -= Math.min(dt, 0.1) * speed * (i % 2 === 0 ? 1 : 1 / 12);
    });
  });
  const { x, z, size, height } = CLOCK_TOWER;
  const stone = lambert('#dcd0bc');
  const stoneDark = lambert('#c2b49c');
  const clockY = height - 1.4;
  const faces = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

  return (
    <group position={[x, 0, z]}>
      {/* 基壇 */}
      <mesh geometry={GEO.box} material={stoneDark} position={[0, 0.2, 0]} scale={[size + 1.2, 0.4, size + 1.2]} receiveShadow castShadow />
      <mesh geometry={GEO.box} material={stone} position={[0, 0.6, 0]} scale={[size + 0.5, 0.4, size + 0.5]} receiveShadow castShadow />
      {/* 塔身 */}
      <mesh geometry={GEO.box} material={stone} position={[0, (height - 3) / 2 + 0.8, 0]} scale={[size, height - 3, size]} castShadow receiveShadow />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            geometry={GEO.box}
            material={stoneDark}
            position={[sx * (size / 2), (height - 3) / 2 + 0.8, sz * (size / 2)]}
            scale={[0.55, height - 3, 0.55]}
            castShadow
          />
        )),
      )}
      {/* 細長い窓 */}
      {faces.map((ry) => (
        <group key={ry} rotation={[0, ry, 0]}>
          {[4.2, 8.2].map((y) => (
            <mesh key={y} geometry={GEO.box} material={lambert('#3d4450')} position={[0, y, size / 2 + 0.02]} scale={[0.55, 2.2, 0.06]} />
          ))}
          <mesh geometry={GEO.box} material={lambert('#6b4a33')} position={[0, 1.9, size / 2 + 0.03]} scale={[1.3, 2.4, 0.06]} />
        </group>
      ))}
      {/* 時計の段 */}
      <mesh geometry={GEO.box} material={stoneDark} position={[0, height - 3 + 0.8, 0]} scale={[size + 0.6, 0.35, size + 0.6]} castShadow />
      <mesh geometry={GEO.box} material={lambert('#ebe2d2')} position={[0, clockY, 0]} scale={[size + 0.3, 3.2, size + 0.3]} castShadow />
      {faces.map((ry, i) => (
        <group key={ry} rotation={[0, ry, 0]}>
          <mesh position={[0, clockY, size / 2 + 0.16]}>
            <circleGeometry args={[1.45, 40]} />
            <meshBasicMaterial color="#fff6dc" toneMapped={false} />
          </mesh>
          <mesh geometry={GEO.ring} material={lambert('#b08a3c')} position={[0, clockY, size / 2 + 0.17]} scale={[3.05, 3.05, 1.5]} />
          <group
            ref={(g) => {
              hands.current[i * 2] = g;
            }}
            position={[0, clockY, size / 2 + 0.22]}
          >
            <mesh geometry={GEO.box} material={lambert('#2c2f3a')} position={[0, 0.55, 0]} scale={[0.08, 1.1, 0.03]} />
          </group>
          <group
            ref={(g) => {
              hands.current[i * 2 + 1] = g;
            }}
            position={[0, clockY, size / 2 + 0.24]}
            rotation={[0, 0, -1.2]}
          >
            <mesh geometry={GEO.box} material={lambert('#2c2f3a')} position={[0, 0.36, 0]} scale={[0.12, 0.72, 0.03]} />
          </group>
        </group>
      ))}
      <Instanced specs={TICKS} castShadow={false}>
        <boxGeometry />
      </Instanced>
      {/* 鐘楼 */}
      <mesh geometry={GEO.box} material={stoneDark} position={[0, height + 0.35, 0]} scale={[size + 0.5, 0.3, size + 0.5]} castShadow />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`b${sx}${sz}`}
            geometry={GEO.box}
            material={stone}
            position={[sx * (size / 2 - 0.3), height + 1.7, sz * (size / 2 - 0.3)]}
            scale={[0.5, 2.5, 0.5]}
            castShadow
          />
        )),
      )}
      <mesh geometry={GEO.hemisphere} material={lambert('#c9a24a')} position={[0, height + 2.3, 0]} rotation={[Math.PI, 0, 0]} scale={[1.4, 1.5, 1.4]} castShadow />
      <mesh geometry={GEO.box} material={stoneDark} position={[0, height + 3.05, 0]} scale={[size + 0.4, 0.3, size + 0.4]} castShadow />
      <mesh position={[0, height + 4.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[size * 0.74, 3.2, 4]} />
        <meshLambertMaterial color="#4f6272" />
      </mesh>
      <mesh geometry={GEO.cylinderLow} material={lambert('#b08a3c')} position={[0, height + 6.8, 0]} scale={[0.06, 1.2, 0.06]} />
      <mesh geometry={GEO.sphereLow} material={lambert('#c9a24a')} position={[0, height + 6.4, 0]} scale={0.3} />
      {phase === 'playing' && <GlowMarker position={[0, 0.85, size / 2 + 2]} radius={1.6} color="#ffe7a8" />}
    </group>
  );
}

// ---- AI端末 ----
function Terminals() {
  const phase = useGame((s) => s.phase);
  const future = useGame((s) => s.future);
  if (future) return null;
  const white = lambert('#eef1f5');
  const screen = glow('#8fe6ff');
  return (
    <group>
      {TERMINALS.map((t) => (
        <group key={t.id} position={[t.x, 0, t.z]}>
          <mesh geometry={GEO.cylinder} material={lambert('#4a525e')} position={[0, 0.08, 0]} scale={[0.9, 0.16, 0.7]} receiveShadow />
          <mesh geometry={GEO.roundedBox} material={white} position={[0, 0.85, 0]} scale={[0.7, 1.5, 0.42]} castShadow />
          {[0, Math.PI].map((ry) => (
            <group key={ry} rotation={[0, ry, 0]}>
              <mesh geometry={GEO.box} material={lambert('#1c2633')} position={[0, 1.2, 0.2]} scale={[0.56, 0.5, 0.04]} />
              <mesh geometry={GEO.box} material={screen} position={[0, 1.2, 0.225]} scale={[0.48, 0.42, 0.01]} />
              <mesh geometry={GEO.box} material={glow('#dff8ff')} position={[0, 1.28, 0.23]} scale={[0.3, 0.04, 0.01]} />
            </group>
          ))}
          <mesh geometry={GEO.sphereLow} material={screen} position={[0, 1.7, 0]} scale={[0.28, 0.12, 0.28]} />
          {phase === 'playing' && <GlowMarker position={[0, 0.2, 0]} radius={1.3} color="#8fe6ff" speed={2.6} />}
        </group>
      ))}
    </group>
  );
}

// ---- 電線 ----
function Wires() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(WIRE_POINTS, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#2d2f33" />
    </lineSegments>
  );
}

const bushSpecs: InstanceSpec[] = BUSHES.flatMap(([x, z, s], i) => [
  spec(x, 0.45 * s, z, 1.4 * s, 1 * s, 1.3 * s, '#5e7a3e', i),
  spec(x + 0.5 * s, 0.35 * s, z + 0.3, 0.9 * s, 0.8 * s, 0.9 * s, '#6d8a45', i * 2),
  spec(x - 0.3 * s, 0.9 * s, z - 0.2, 0.25, 1.2 * s, 0.25, '#8a9a4f', 0),
]);

// ---- 街全体 ----
export function City() {
  const future = useGame((s) => s.future);
  const endingId = useGame((s) => s.result?.endingId);
  const tint = future && endingId ? ENDING_MAP[endingId].buildingTint : null;

  return (
    <group>
      <Ground />
      <Instanced specs={CITY_PARTS.structure} geometry={GEO.box} tint={tint} tintAmount={0.55} />
      <Instanced specs={CITY_PARTS.gables} geometry={GEO.gable} tint={tint} tintAmount={0.55} />
      <Instanced specs={CITY_PARTS.detail} geometry={GEO.box} tint={tint} tintAmount={0.2} />
      <Instanced specs={CITY_PARTS.cylinders} geometry={GEO.cylinder} tint={tint} tintAmount={0.3} />
      <Instanced specs={CITY_PARTS.glow} geometry={GEO.box} unlit />
      <Instanced specs={TREE_PARTS.trunks} geometry={GEO.cylinderLow} />
      <Instanced specs={TREE_PARTS.crowns} geometry={GEO.blob} />
      <Instanced specs={TREE_PARTS.cones} geometry={GEO.coneLow} />
      <Instanced specs={PROP_PARTS.detail} geometry={GEO.box} visible={!future} />
      <Instanced specs={PROP_PARTS.cylinders} geometry={GEO.cylinder} visible={!future} />
      <Instanced specs={PROP_PARTS.glow} geometry={GEO.box} unlit visible={!future} />
      <Instanced specs={bushSpecs} geometry={GEO.blob} visible={!future} />
      {!future && <Wires />}
      <ClockTower />
      <Terminals />
      {!future && <HeatPatches />}
      {!future && <Traffic />}
    </group>
  );
}
