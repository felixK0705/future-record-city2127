// 100年後の街に現れるもの。
// 結末ごとの専用の物と、上位3つの行動に対応する物を重ねて描画する。

import { useMemo, useRef, type ReactElement } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BEHAVIOR_MAP, type FutureVisual } from '../data/behaviors';
import { ENDING_MAP } from '../data/endings';
import { BUILDINGS, CLOCK_TOWER } from '../game/cityData';
import { useGame } from '../game/store';
import { Instanced, type InstanceSpec } from './Instanced';

const s = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
  ry = 0,
  rx = 0,
  rz = 0,
): InstanceSpec => ({ x, y, z, sx, sy, sz, color, ry, rx, rz });

// 疑似乱数（見た目の揺らぎ用）
const jitter = (i: number, k = 1) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;

// ---- 緑の回廊：大通りと東西の通りに木のアーチ ----
function GreenCorridor() {
  const arches = useMemo(() => {
    const out: InstanceSpec[] = [];
    for (let x = -56; x <= 56; x += 8) out.push(s(x, 0, 26, 5, 5, 5, '#5f9a52', Math.PI / 2));
    for (let z = -54; z <= 12; z += 9) {
      out.push(s(-20.5, 0, z, 3, 3.6, 3, '#6aa65a'));
      out.push(s(20.5, 0, z, 3, 3.6, 3, '#6aa65a'));
    }
    return out;
  }, []);
  const flowers = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) =>
        s(-60 + i * 2, 0.25, 26 + (i % 2 ? 4.2 : -4.2), 0.5, 0.5, 0.5, ['#f2a0b5', '#ffd66b', '#ffffff'][i % 3]),
      ),
    [],
  );
  return (
    <group>
      <Instanced specs={arches}>
        <torusGeometry args={[1, 0.08, 6, 18, Math.PI]} />
      </Instanced>
      <Instanced specs={flowers}>
        <icosahedronGeometry args={[1, 0]} />
      </Instanced>
    </group>
  );
}

// ---- 空中のポッド環状線 ----
function PodRail() {
  const pods = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (pods.current) pods.current.rotation.y += dt * 0.12;
  });
  const pillars = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return s(Math.cos(a) * 44, 5, Math.sin(a) * 44, 0.6, 10, 0.6, '#dfe6ee');
      }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[44, 0.35, 8, 96]} />
        <meshLambertMaterial color="#e8eef6" />
      </mesh>
      <Instanced specs={pillars}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
      </Instanced>
      <group ref={pods}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 44, 11, Math.sin(a) * 44]} rotation={[0, -a, 0]} scale={[1, 0.8, 1.6]}>
              <sphereGeometry args={[1, 16, 10]} />
              <meshLambertMaterial color="#ffffff" emissive="#335566" />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ---- 縁側：家と家をつなぐ木の縁側 ----
function EngawaDeck() {
  const decks = useMemo(() => {
    const out: InstanceSpec[] = [];
    for (const x of [-48.5, -37.5, -26.5]) out.push(s(x, 0.35, -21, 2.4, 0.3, 76, '#b98a5a'));
    for (const z of [-48.5, -37.5, -26.5, -15.5, -4.5, 6.5]) out.push(s(-39, 0.36, z, 40, 0.3, 1.6, '#c49563'));
    out.push(s(39, 0.35, -22, 2, 0.3, 70, '#b98a5a'));
    return out;
  }, []);
  const posts = useMemo(() => {
    const out: InstanceSpec[] = [];
    for (let z = -58; z <= 16; z += 4) {
      for (const x of [-48.5, -37.5, -26.5]) out.push(s(x + 1.1, 0.6, z, 0.12, 0.6, 0.12, '#7a5a3a'));
    }
    return out;
  }, []);
  return (
    <group>
      <Instanced specs={decks}>
        <boxGeometry />
      </Instanced>
      <Instanced specs={posts}>
        <boxGeometry />
      </Instanced>
    </group>
  );
}

// ---- 子どもの遊び場 ----
function Playground() {
  const parts = useMemo(
    () => [
      s(-43, 0, 1, 2.4, 2.4, 2.4, '#f2a541'),
      s(-40, 0, 3, 1.6, 1.6, 1.6, '#5bb56f'),
      s(-46, 0, -1, 1.8, 1.8, 1.8, '#e86f68'),
      s(8, 0, -8, 2.2, 2.2, 2.2, '#4fa3d9'),
      s(11, 0, -4, 1.4, 1.4, 1.4, '#f0c24b'),
      s(-8, 0, 50, 2, 2, 2, '#b07cd8'),
    ],
    [],
  );
  return (
    <group>
      <Instanced specs={parts}>
        <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Instanced>
      <mesh position={[-43, 1.6, 6]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[1.2, 0.15, 5]} />
        <meshLambertMaterial color="#e86f68" />
      </mesh>
    </group>
  );
}

// ---- 提灯通り（商店街） ----
function LanternStreet() {
  const lanterns = useMemo(() => {
    const out: InstanceSpec[] = [];
    for (let z = -58; z <= 14; z += 3) {
      out.push(s(35, 4.2, z, 0.35, 0.5, 0.35, '#ff9a4a'));
      out.push(s(43.5, 4.2, z + 1.5, 0.35, 0.5, 0.35, '#ffb85c'));
    }
    return out;
  }, []);
  return (
    <group>
      <Instanced specs={lanterns} unlit>
        <sphereGeometry args={[1, 10, 8]} />
      </Instanced>
      <mesh position={[35, 4.6, -22]}>
        <boxGeometry args={[0.05, 0.05, 74]} />
        <meshBasicMaterial color="#3a2a20" />
      </mesh>
      <mesh position={[43.5, 4.6, -22]}>
        <boxGeometry args={[0.05, 0.05, 74]} />
        <meshBasicMaterial color="#3a2a20" />
      </mesh>
    </group>
  );
}

// ---- 相棒ロボット ----
function CompanionBots() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((c, i) => {
      const a = clock.elapsedTime * 0.25 + i * 0.9;
      const r = 9 + (i % 3) * 2.5;
      c.position.set(Math.cos(a) * r, 0.5 + Math.abs(Math.sin(clock.elapsedTime * 3 + i)) * 0.15, Math.sin(a) * r);
      c.rotation.y = -a;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i}>
          <mesh>
            <sphereGeometry args={[0.45, 14, 10]} />
            <meshLambertMaterial color="#eef3f8" />
          </mesh>
          <mesh position={[0, 0.1, 0.4]}>
            <boxGeometry args={[0.35, 0.08, 0.08]} />
            <meshBasicMaterial color="#6fe3ff" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- 循環塔 ----
function RecycleTower() {
  const rings = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (rings.current) rings.current.rotation.y += dt * 0.5;
  });
  return (
    <group position={[0, 0, -21]}>
      <mesh position={[0, 7, 0]}>
        <cylinderGeometry args={[1.4, 2.4, 14, 16]} />
        <meshLambertMaterial color="#7fae84" />
      </mesh>
      <mesh position={[0, 15, 0]}>
        <sphereGeometry args={[1.8, 16, 12]} />
        <meshLambertMaterial color="#a8d8a0" emissive="#1f4a24" />
      </mesh>
      <group ref={rings}>
        {[4, 8, 12].map((y, i) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, i * 0.3]}>
            <torusGeometry args={[3 - i * 0.4, 0.12, 6, 40]} />
            <meshBasicMaterial color="#b6f5a8" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---- 自律清掃ドローン ----
function CleanDrones() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((c, i) => {
      const t = clock.elapsedTime * 0.4 + i;
      c.position.set(Math.sin(t * 0.7 + i) * 50, 4 + Math.sin(t * 2) * 0.5, 44 + Math.cos(t * 0.9 + i * 2) * 12 - (i % 2) * 20);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i}>
          <mesh>
            <boxGeometry args={[0.8, 0.2, 0.8]} />
            <meshLambertMaterial color="#f0f3f7" />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshBasicMaterial color="#7fe0ff" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- 冷却の森：広場いっぱいの木々 ----
function CoolForest() {
  const { trunks, crowns } = useMemo(() => {
    const trunks: InstanceSpec[] = [];
    const crowns: InstanceSpec[] = [];
    let i = 0;
    for (let x = -15; x <= 15; x += 6) {
      for (let z = -15; z <= 15; z += 6) {
        if (Math.hypot(x, z) < 7) continue;
        const k = 1.2 + Math.abs(jitter(i)) * 0.6;
        const ox = x + jitter(i, 2) * 1.5;
        const oz = z + jitter(i, 3) * 1.5;
        trunks.push(s(ox, 2 * k, oz, 0.45 * k, 4 * k, 0.45 * k, '#6b4f3a'));
        crowns.push(s(ox, 5.2 * k, oz, 2.8 * k, 2.4 * k, 2.8 * k, i % 2 ? '#3f7f45' : '#4f9350'));
        i++;
      }
    }
    return { trunks, crowns };
  }, []);
  return (
    <group>
      <Instanced specs={trunks}>
        <cylinderGeometry args={[0.5, 0.6, 1, 6]} />
      </Instanced>
      <Instanced specs={crowns}>
        <icosahedronGeometry args={[1, 1]} />
      </Instanced>
    </group>
  );
}

// ---- 立体交通レーン ----
function SkyLanes() {
  const pillars = useMemo(
    () => Array.from({ length: 9 }, (_, i) => s(-56 + i * 14, 6, 26, 0.9, 12, 0.9, '#c9d3e0')),
    [],
  );
  return (
    <group>
      <mesh position={[0, 7, 23]}>
        <boxGeometry args={[124, 0.5, 4]} />
        <meshLambertMaterial color="#d6dee9" />
      </mesh>
      <mesh position={[0, 12, 29]}>
        <boxGeometry args={[124, 0.5, 4]} />
        <meshLambertMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, 7.3, 23]}>
        <boxGeometry args={[124, 0.05, 0.25]} />
        <meshBasicMaterial color="#7fe0ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 12.3, 29]}>
        <boxGeometry args={[124, 0.05, 0.25]} />
        <meshBasicMaterial color="#ffd36b" toneMapped={false} />
      </mesh>
      <Instanced specs={pillars}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
      </Instanced>
    </group>
  );
}

// ---- シェアキッチン（市場の中央） ----
function ShareKitchen() {
  const tables = useMemo(
    () => [42, 46, 50, 54].map((z) => s(0, 0.8, z, 12, 0.15, 1.4, '#c49563')),
    [],
  );
  const legs = useMemo(
    () => [42, 46, 50, 54].flatMap((z) => [-5.5, 5.5].map((x) => s(x, 0.4, z, 0.15, 0.8, 1.2, '#7a5a3a'))),
    [],
  );
  return (
    <group>
      <mesh position={[0, 5, 48]}>
        <boxGeometry args={[17, 0.3, 17]} />
        <meshLambertMaterial color="#f2e6cf" />
      </mesh>
      {[-8, 8].flatMap((x) =>
        [40, 56].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 2.5, z]}>
            <cylinderGeometry args={[0.2, 0.2, 5, 8]} />
            <meshLambertMaterial color="#8a6a4e" />
          </mesh>
        )),
      )}
      <Instanced specs={tables}>
        <boxGeometry />
      </Instanced>
      <Instanced specs={legs}>
        <boxGeometry />
      </Instanced>
    </group>
  );
}

// ---- 灯りの鈴 ----
function HelpBells() {
  const spots: [number, number][] = [
    [-23, -45],
    [-23, -12],
    [-37.5, 8],
    [39, -40],
    [39, 8],
    [-18, 40],
    [22, 40],
    [16, -16],
  ];
  const posts = spots.map(([x, z]) => s(x, 1.5, z, 0.12, 3, 0.12, '#6b5a4a'));
  const bells = spots.map(([x, z]) => s(x, 3.1, z, 0.35, 0.4, 0.35, '#ffd36b'));
  return (
    <group>
      <Instanced specs={posts}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
      </Instanced>
      <Instanced specs={bells} unlit>
        <sphereGeometry args={[1, 12, 8]} />
      </Instanced>
    </group>
  );
}

// ---- AIの尖塔（時計塔の上に伸びる） ----
function AiSpire() {
  const rings = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    rings.current?.children.forEach((c, i) => {
      c.position.y = CLOCK_TOWER.height + 8 + ((clock.elapsedTime * 3 + i * 8) % 26);
    });
  });
  return (
    <group position={[CLOCK_TOWER.x, 0, CLOCK_TOWER.z]}>
      <mesh position={[0, CLOCK_TOWER.height + 20, 0]}>
        <cylinderGeometry args={[0.2, 1.2, 28, 8]} />
        <meshLambertMaterial color="#f2f6fb" emissive="#1c3a52" />
      </mesh>
      <group ref={rings}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.8, 0.08, 6, 32]} />
            <meshBasicMaterial color="#7fe0ff" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---- 雲まで届くタワー ----
function SkyTowers() {
  const towers = useMemo(() => {
    const base = BUILDINGS.filter((b) => b.kind === 'apartment').slice(0, 12);
    return base.map((b, i) => {
      const h = 40 + Math.abs(jitter(i)) * 50;
      return s(b.x, b.h + h / 2, b.z, b.w * 0.7, h, b.d * 0.7, i % 2 ? '#a9c1e0' : '#c7d6ea');
    });
  }, []);
  const tops = useMemo(
    () => towers.map((t) => s(t.x, t.y + t.sy / 2 + 0.4, t.z, t.sx * 0.9, 0.3, t.sz * 0.9, '#ffffff')),
    [towers],
  );
  return (
    <group>
      <Instanced specs={towers}>
        <boxGeometry />
      </Instanced>
      <Instanced specs={tops} unlit>
        <boxGeometry />
      </Instanced>
    </group>
  );
}

// ---- 陽だまり発電の屋根 ----
function SolarRoofs() {
  const panels = useMemo(
    () =>
      BUILDINGS.filter((b) => b.kind === 'house' || b.kind === 'shop' || b.kind === 'apartment').map((b) =>
        s(b.x, b.h + (b.kind === 'house' ? 2.1 : 0.4), b.z, b.w * 0.8, 0.12, b.d * 0.8, '#2d4a78', 0, -0.25),
      ),
    [],
  );
  return (
    <Instanced specs={panels}>
      <boxGeometry />
    </Instanced>
  );
}

// ---- 巨樹と蔦（森と共生する街） ----
function MegaTrees() {
  const spots: [number, number, number][] = [
    [-40, -40, 1.2],
    [40, -40, 1],
    [-30, 48, 1.1],
    [34, 48, 0.9],
    [0, -44, 1.3],
  ];
  const vines = useMemo(
    () =>
      BUILDINGS.filter((b) => b.kind !== 'stall').map((b) =>
        s(b.x, b.h * 0.4, b.z, b.w + 0.12, b.h * 0.8, b.d + 0.12, '#5c8f4c'),
      ),
    [],
  );
  const roofs = useMemo(
    () => BUILDINGS.filter((b) => b.kind !== 'stall').map((b) => s(b.x, b.h + 0.3, b.z, b.w * 0.9, 0.6, b.d * 0.9, '#4f8a42')),
    [],
  );
  return (
    <group>
      {spots.map(([x, z, k]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]} scale={k}>
          <mesh position={[0, 11, 0]}>
            <cylinderGeometry args={[1.4, 2.4, 22, 10]} />
            <meshLambertMaterial color="#6b4f3a" />
          </mesh>
          <mesh position={[0, 24, 0]}>
            <icosahedronGeometry args={[10, 1]} />
            <meshLambertMaterial color="#3f7f45" />
          </mesh>
          <mesh position={[5, 20, 3]}>
            <icosahedronGeometry args={[6, 1]} />
            <meshLambertMaterial color="#4f9350" />
          </mesh>
        </group>
      ))}
      <Instanced specs={vines} transparent opacity={0.55}>
        <boxGeometry />
      </Instanced>
      <Instanced specs={roofs}>
        <boxGeometry />
      </Instanced>
    </group>
  );
}

// ---- 白いドーム群（最適化された街） ----
function WhiteDomes() {
  const domes = useMemo(
    () => [
      s(-38, 0, -30, 9, 9, 9, '#f4f7fb'),
      s(-40, 0, 2, 6, 6, 6, '#eef2f8'),
      s(40, 0, -30, 8, 8, 8, '#f4f7fb'),
      s(-30, 0, 47, 7, 7, 7, '#eef2f8'),
      s(32, 0, 47, 7, 7, 7, '#f4f7fb'),
      s(0, 0, -40, 8, 8, 8, '#eef2f8'),
    ],
    [],
  );
  const bands = useMemo(() => domes.map((d) => s(d.x, 0.4, d.z, d.sx * 1.02, d.sz * 1.02, 1, '#7fe0ff', 0, Math.PI / 2)), [domes]);
  return (
    <group>
      <Instanced specs={domes}>
        <sphereGeometry args={[1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Instanced>
      <Instanced specs={bands} unlit>
        <torusGeometry args={[1, 0.02, 4, 48]} />
      </Instanced>
    </group>
  );
}

// ---- 空中の島々 ----
function FloatingIslands() {
  const group = useRef<THREE.Group>(null);
  const islands: [number, number, number, number][] = [
    [-35, 32, -25, 6],
    [30, 40, -35, 7],
    [-10, 46, 45, 5],
    [42, 30, 40, 5.5],
    [-45, 38, 20, 4.5],
  ];
  useFrame(({ clock }) => {
    group.current?.children.forEach((c, i) => {
      c.position.y = islands[i][1] + Math.sin(clock.elapsedTime * 0.5 + i) * 0.8;
    });
  });
  return (
    <group ref={group}>
      {islands.map(([x, y, z, r]) => (
        <group key={`${x}-${z}`} position={[x, y, z]}>
          <mesh position={[0, -r * 0.6, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[r, r * 1.4, 7]} />
            <meshLambertMaterial color="#8a7a66" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[r, r, 0.4, 7]} />
            <meshLambertMaterial color="#6fae5c" />
          </mesh>
          <mesh position={[r * 0.3, 3, 0]}>
            <boxGeometry args={[r * 0.5, 6, r * 0.5]} />
            <meshLambertMaterial color="#e9eef6" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- 誰のものでもない庭（調和の街） ----
function HarmonyGarden() {
  const beds = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        const r = i % 2 ? 9 : 12;
        return s(Math.cos(a) * r, 0.35, Math.sin(a) * r, 0.9, 0.7, 0.9, ['#f2a0b5', '#ffd66b', '#b07cd8', '#ffffff', '#7fc4e8'][i % 5]);
      }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[14, 0.5, 6, 64]} />
        <meshLambertMaterial color="#5f9a52" />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5, 14, 64]} />
        <meshLambertMaterial color="#8fbf73" />
      </mesh>
      <Instanced specs={beds}>
        <icosahedronGeometry args={[1, 0]} />
      </Instanced>
    </group>
  );
}

// ---- 街じゅうのシェアステーション ----
function ShareStationsFuture() {
  const { roofs, posts, carts, wheels } = useMemo(() => {
    const spots: [number, number][] = [
      [-22, -48],
      [5, 49],
      [-6, 14],
      [39, -30],
      [-40, 23],
      [30, 23],
      [-45, -8],
      [22, -45],
    ];
    const roofs: InstanceSpec[] = [];
    const posts: InstanceSpec[] = [];
    const carts: InstanceSpec[] = [];
    const wheels: InstanceSpec[] = [];
    spots.forEach(([x, z]) => {
      roofs.push(s(x, 2.6, z, 4.2, 0.14, 2.2, '#4f9a6a'));
      roofs.push(s(x, 2.72, z, 3.6, 0.06, 1.6, '#bff5c8'));
      for (const dx of [-1.9, 1.9]) posts.push(s(x + dx, 1.3, z - 0.9, 0.12, 2.6, 0.12, '#3f8a5f'));
      for (let i = 0; i < 3; i++) carts.push(s(x - 1.2 + i * 1.2, 0.7, z, 0.8, 0.55, 1.0, i % 2 ? '#3f8a5f' : '#5aa36b'));
      for (let i = 0; i < 2; i++) {
        for (const wz of [-0.5, 0.5]) wheels.push(s(x + 2.6 + i * 0.7, 0.35, z + wz, 0.7, 0.7, 0.7, '#2d3036', Math.PI / 2));
      }
    });
    return { roofs, posts, carts, wheels };
  }, []);
  return (
    <group>
      <Instanced specs={roofs}>
        <boxGeometry />
      </Instanced>
      <Instanced specs={posts}>
        <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
      </Instanced>
      <Instanced specs={carts}>
        <boxGeometry />
      </Instanced>
      <Instanced specs={wheels}>
        <torusGeometry args={[0.5, 0.08, 6, 16]} />
      </Instanced>
    </group>
  );
}

const VISUALS: Record<FutureVisual, () => ReactElement> = {
  shareStations: ShareStationsFuture,
  greenCorridor: GreenCorridor,
  podRail: PodRail,
  engawaDeck: EngawaDeck,
  playground: Playground,
  lanternStreet: LanternStreet,
  companionBots: CompanionBots,
  recycleTower: RecycleTower,
  cleanDrones: CleanDrones,
  coolForest: CoolForest,
  skyLanes: SkyLanes,
  shareKitchen: ShareKitchen,
  helpBells: HelpBells,
  aiSpire: AiSpire,
  skyTowers: SkyTowers,
  solarRoofs: SolarRoofs,
  megaTrees: MegaTrees,
  whiteDomes: WhiteDomes,
  floatingIslands: FloatingIslands,
  harmonyGarden: HarmonyGarden,
};

export function FutureLayer() {
  const future = useGame((s) => s.future);
  const result = useGame((s) => s.result);
  const visuals = useMemo(() => {
    if (!result) return [];
    const set = new Set<FutureVisual>(ENDING_MAP[result.endingId].visuals);
    for (const b of result.topBehaviors) set.add(BEHAVIOR_MAP[b].futureObject.visual);
    return [...set];
  }, [result]);

  if (!future || !result) return null;
  return (
    <group>
      {visuals.map((v) => {
        const Visual = VISUALS[v];
        return <Visual key={v} />;
      })}
    </group>
  );
}
