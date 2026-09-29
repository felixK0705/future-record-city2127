// 街の住人。近づくとひとことが浮かび、話しかけると台詞を返す。

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NPCS, type NpcDef } from '../data/npcs';
import { TROUBLE_BY_NPC } from '../data/troubles';
import { BENCHES, collidesStatic } from '../game/cityData';
import { resolveCollision } from '../game/collision';
import { troubleAmbient } from '../game/helping';
import { NPC_AMBIENT_RADIUS } from '../game/constants';
import { runtime } from '../game/runtime';
import { useGame } from '../game/store';
import { SpeechBubble } from '../ui/SpeechBubble';
import { GEO, glow, lambert } from './geometries';
import { Humanoid, type HumanoidLook, type HumanoidMotion } from './Humanoid';

const WANDER_SPEED = 1.1;

/** 文字列から安定した数を作る（見た目のばらつき用） */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** NPC の種類と ID から見た目を決める */
function lookFor(npc: NpcDef): HumanoidLook {
  const h = hash(npc.id);
  const skins = ['#f0cfb3', '#e8c09e', '#d9a97f', '#f3d6bf'];
  const skin = skins[h % skins.length];
  switch (npc.type) {
    case 'elder':
      return {
        skin,
        hair: h % 2 ? '#dedbd5' : '#c9c6c0',
        hairStyle: h % 3 === 0 ? 'short' : 'bun',
        top: npc.color,
        bottom: '#5c5752',
        shoes: '#3a332d',
        stoop: true,
        accessory: npc.sitting || TROUBLE_BY_NPC[npc.id] ? 'none' : 'cane',
      };
    case 'child':
      // 中学生は少し大きく、ランドセルは背負わない
      if (npc.id.startsWith('teen')) {
        return {
          skin,
          hair: '#231c18',
          hairStyle: 'short',
          top: npc.color,
          bottom: '#2b3550',
          shoes: '#f2f0ea',
          scale: 0.86,
          accessory: 'none',
          accent: '#c9d3e0',
        };
      }
      return {
        skin,
        hair: '#2f2622',
        hairStyle: (['cap', 'bob', 'short'] as const)[h % 3],
        top: npc.color,
        bottom: h % 2 ? '#3d5a80' : '#6b4f7a',
        shoes: '#e9e6df',
        scale: 0.64,
        accessory: 'randoseru',
        accent: '#3f7fc4',
      };
    case 'worker':
    default:
      return {
        skin,
        hair: h % 2 ? '#2a2420' : '#4a3a2e',
        hairStyle: h % 3 === 0 ? 'long' : 'short',
        top: npc.color,
        bottom: '#2c2f38',
        shoes: '#1f1b18',
        accent: ['#b83a3a', '#3a6fb8', '#d9a13a'][h % 3],
        accessory: TROUBLE_BY_NPC[npc.id] ? 'none' : h % 2 ? 'briefcase' : 'bag',
      };
  }
}

/** ロボットの体（配達・案内・交通・清掃で少しずつ形が違う） */
function RobotBody({ npc, motion }: { npc: NpcDef; motion: React.MutableRefObject<HumanoidMotion> }) {
  const head = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const body = lambert(npc.color);
  const white = lambert('#f2f5f8');
  const dark = lambert('#39414d');
  const cyan = glow('#6fe3ff');
  const delivery = npc.id.includes('delivery');
  const cleaner = npc.id.includes('cleaner');

  useFrame(({ clock }, dt) => {
    if (head.current) head.current.rotation.y = Math.sin(clock.elapsedTime * 0.8 + hash(npc.id)) * 0.4;
    if (wheels.current) wheels.current.rotation.x += Math.min(dt, 0.1) * motion.current.speed * 3;
  });

  return (
    <group>
      {/* 足回り */}
      <mesh geometry={GEO.cylinder} material={dark} position={[0, 0.2, 0]} scale={[cleaner ? 1.1 : 0.8, 0.22, cleaner ? 1.1 : 0.8]} castShadow />
      <group ref={wheels} position={[0, 0.16, 0]}>
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} geometry={GEO.wheel} material={lambert('#1c1d21')} position={[x, 0, 0]} scale={[0.1, 0.3, 0.3]} />
        ))}
      </group>
      {/* 胴体 */}
      <mesh geometry={GEO.roundedBox} material={white} position={[0, 0.75, 0]} scale={[0.72, 0.85, 0.58]} castShadow />
      <mesh geometry={GEO.box} material={body} position={[0, 0.55, 0]} scale={[0.74, 0.12, 0.6]} />
      <mesh geometry={GEO.roundedBox} material={lambert('#1f2a36')} position={[0, 0.85, 0.3]} scale={[0.42, 0.3, 0.03]} />
      <mesh geometry={GEO.box} material={cyan} position={[0, 0.85, 0.32]} scale={[0.3, 0.05, 0.01]} />
      {delivery && (
        <mesh geometry={GEO.roundedBox} material={lambert('#e8a33a')} position={[0, 1.05, -0.22]} scale={[0.6, 0.45, 0.4]} castShadow />
      )}
      {cleaner && (
        <>
          <mesh geometry={GEO.cylinderLow} material={lambert('#4fa36b')} position={[0.45, 0.25, 0.35]} scale={[0.25, 0.1, 0.25]} />
          <mesh geometry={GEO.cylinderLow} material={lambert('#4fa36b')} position={[-0.45, 0.25, 0.35]} scale={[0.25, 0.1, 0.25]} />
        </>
      )}
      {/* 腕 */}
      {[-0.44, 0.44].map((x) => (
        <mesh key={x} geometry={GEO.limb} material={body} position={[x, 0.78, 0]} rotation={[0.2, 0, x > 0 ? -0.15 : 0.15]} scale={[0.12, 0.2, 0.12]} />
      ))}
      {/* 頭 */}
      <group ref={head} position={[0, 1.42, 0]}>
        <mesh geometry={GEO.sphere} material={white} scale={[0.62, 0.52, 0.56]} castShadow />
        <mesh geometry={GEO.roundedBox} material={lambert('#1b2330')} position={[0, 0.02, 0.2]} scale={[0.46, 0.2, 0.16]} />
        <mesh geometry={GEO.sphereLow} material={cyan} position={[-0.1, 0.02, 0.29]} scale={0.08} />
        <mesh geometry={GEO.sphereLow} material={cyan} position={[0.1, 0.02, 0.29]} scale={0.08} />
        <mesh geometry={GEO.cylinderLow} material={dark} position={[0, 0.35, 0]} scale={[0.03, 0.25, 0.03]} />
        <mesh geometry={GEO.sphereLow} material={cyan} position={[0, 0.5, 0]} scale={0.09} />
        <mesh geometry={GEO.cylinder} material={body} position={[0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.16, 0.06, 0.16]} />
        <mesh geometry={GEO.cylinder} material={body} position={[-0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.16, 0.06, 0.16]} />
      </group>
    </group>
  );
}

/** 向きをなめらかに目標へ回す */
function turnToward(g: THREE.Group, target: number, dt: number, rate: number) {
  let diff = target - g.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  g.rotation.y += diff * (1 - Math.exp(-dt * rate));
}

function Npc({ npc }: { npc: NpcDef }) {
  const group = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Mesh>(null);
  const [near, setNear] = useState(false);
  const [ambient, setAmbient] = useState<string | null>(npc.ambient);
  const [waiting, setWaiting] = useState(!!TROUBLE_BY_NPC[npc.id]);
  const dialog = useGame((s) => (s.dialog?.npcId === npc.id ? s.dialog : null));
  const phase = useGame((s) => s.phase);
  const brain = useRef({ tx: npc.position[0], tz: npc.position[1], wait: Math.random() * 3 });
  const motion = useRef<HumanoidMotion>({ speed: 0, sitting: npc.sitting });
  const look = useMemo(() => lookFor(npc), [npc]);
  const trouble = TROUBLE_BY_NPC[npc.id];
  const followSpeed = npc.type === 'elder' ? 3.0 : 4.8;
  // 座っている人は近くのベンチの向きに合わせる
  const sitRot = useMemo(() => {
    if (!npc.sitting) return 0;
    const bench = BENCHES.find((b) => Math.hypot(b.x - npc.position[0], b.z - npc.position[1]) < 1.5);
    return bench?.rot ?? 0;
  }, [npc]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = group.current;
    if (!g) return;
    const pos = runtime.npcPos[npc.id];
    const p = runtime.player;
    const dPlayer = Math.hypot(pos.x - p.x, pos.z - p.z);
    const b = brain.current;
    const script = runtime.npcScript[npc.id];
    let moved = 0;

    const stepToward = (tx: number, tz: number, speed: number, arrive = 0.12): boolean => {
      const dx = tx - pos.x;
      const dz = tz - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < arrive) return true;
      const step = Math.min(d, speed * dt);
      pos.x += (dx / d) * step;
      pos.z += (dz / d) * step;
      moved = step;
      turnToward(g, Math.atan2(dx, dz), dt, 8);
      return d - step < arrive;
    };

    if (script) {
      // 台本どおりに動く（付き添い・助っ人・目的地への移動）
      if (script.mode === 'follow') {
        const tx = p.x - Math.sin(p.heading) * 1.5;
        const tz = p.z - Math.cos(p.heading) * 1.5;
        if (dPlayer < 14 && dPlayer > 1.8) {
          stepToward(tx, tz, Math.min(followSpeed, (dPlayer - 1.2) * 2.2));
          resolveCollision(pos, 0.35, false);
        } else if (dPlayer <= 1.8) {
          turnToward(g, Math.atan2(p.x - pos.x, p.z - pos.z), dt, 6);
        }
      } else if (script.mode === 'followNpc') {
        const o = runtime.npcPos[script.id];
        const tx = o.x - Math.sin(o.h + 0.6) * 1.3;
        const tz = o.z - Math.cos(o.h + 0.6) * 1.3;
        if (Math.hypot(tx - pos.x, tz - pos.z) > 0.4) stepToward(tx, tz, 2.2);
        else turnToward(g, o.h, dt, 5);
      } else if (script.idx < script.points.length) {
        const [tx, tz] = script.points[script.idx];
        if (stepToward(tx, tz, script.speed)) script.idx++;
      }
    } else if (npc.wander > 0 && dPlayer > 3.2) {
      // 歩き回る（プレイヤーが近いときは立ち止まって向き合う）
      if (b.wait > 0) {
        b.wait -= dt;
      } else if (stepToward(b.tx, b.tz, WANDER_SPEED, 0.2)) {
        b.wait = 2 + Math.random() * 4;
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * npc.wander;
          const nx = npc.position[0] + Math.cos(a) * r;
          const nz = npc.position[1] + Math.sin(a) * r;
          if (!collidesStatic(nx, nz, 0.6)) {
            b.tx = nx;
            b.tz = nz;
            break;
          }
        }
      }
    } else if (dPlayer < 4 && !npc.sitting) {
      turnToward(g, Math.atan2(p.x - pos.x, p.z - pos.z), dt, 6);
    }

    motion.current.speed = dt > 0 ? moved / dt : 0;
    // 台本で動き出したら、座っていた人も立ち上がる
    motion.current.sitting = npc.sitting && !script;
    pos.h = g.rotation.y;
    g.position.set(pos.x, 0, pos.z);
    g.visible = !runtime.npcHidden.has(npc.id);

    if (marker.current) {
      marker.current.position.y = 2.5 + Math.sin(clock.elapsedTime * 2.4) * 0.1;
      marker.current.rotation.y += dt * 2;
    }

    const isNear = dPlayer < (near ? NPC_AMBIENT_RADIUS + 1 : NPC_AMBIENT_RADIUS);
    if (isNear !== near) setNear(isNear);
    if (trouble) {
      const text = troubleAmbient(npc.id);
      if (text !== ambient) setAmbient(text);
      const w = runtime.troubles[trouble.id].stage === 'waiting';
      if (w !== waiting) setWaiting(w);
    }
  });

  const playing = phase === 'playing';
  const headY = npc.type === 'robot' ? 2.0 : npc.type === 'child' ? (npc.id.startsWith('teen') ? 1.85 : 1.45) : npc.sitting ? 1.6 : 2.05;
  const bubbleText = dialog ? dialog.text : near ? ambient : null;

  return (
    <group ref={group} position={[npc.position[0], 0, npc.position[1]]} rotation={[0, sitRot, 0]}>
      {npc.type === 'robot' ? <RobotBody npc={npc} motion={motion} /> : <Humanoid look={look} motion={motion} />}
      {waiting && playing && (
        <mesh ref={marker} geometry={GEO.rock} material={glow('#ffd36b')} position={[0, 2.5, 0]} scale={0.34} />
      )}
      {playing && bubbleText && (
        <Html position={[0, headY + 0.35, 0]} zIndexRange={[20, 0]}>
          <SpeechBubble
            key={dialog ? dialog.key : 'ambient'}
            text={bubbleText}
            active={!!dialog}
            robot={npc.type === 'robot'}
          />
        </Html>
      )}
    </group>
  );
}

export function Npcs() {
  const future = useGame((s) => s.future);
  const phase = useGame((s) => s.phase);
  if (future || phase === 'reveal') return null;
  return (
    <group>
      {NPCS.map((n) => (
        <Npc key={n.id} npc={n} />
      ))}
    </group>
  );
}
