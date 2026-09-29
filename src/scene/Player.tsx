// プレイヤー：移動・走る・当たり判定・ポッド乗車中の移動

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STATIONS } from '../game/cityData';
import { resolveCollision } from '../game/collision';
import { PLAYER_RADIUS, RUN_SPEED, WALK_SPEED } from '../game/constants';
import { interact } from '../game/interaction';
import { runtime } from '../game/runtime';
import { useGame } from '../game/store';
import { Humanoid, type HumanoidLook, type HumanoidMotion } from './Humanoid';

/** プレイヤーの見た目 */
const PLAYER_LOOK: HumanoidLook = {
  skin: '#f2d2b6',
  hair: '#3a2c24',
  hairStyle: 'short',
  top: '#f5efe2',
  bottom: '#4a5a78',
  shoes: '#e9e4da',
  accessory: 'backpack',
  scarf: true,
  accent: '#ff8f4a',
};

const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
]);

function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (MOVE_KEYS.has(e.code)) {
        runtime.input.keys.add(e.code);
        if (e.code.startsWith('Arrow')) e.preventDefault();
      }
      if (e.code === 'KeyE' && !e.repeat) interact();
      if (e.code === 'Escape') useGame.getState().closePanel();
    };
    const up = (e: KeyboardEvent) => runtime.input.keys.delete(e.code);
    const blur = () => runtime.input.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function Player() {
  useKeyboard();
  const group = useRef<THREE.Group>(null);
  const motion = useRef<HumanoidMotion>({ speed: 0 });
  const velocity = useRef(new THREE.Vector2());
  const phase = useGame((s) => s.phase);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const p = runtime.player;
    const g = group.current;
    if (!g) return;
    const playing = useGame.getState().phase === 'playing';

    // ---- ポッド乗車中 ----
    if (runtime.ride) {
      const r = runtime.ride;
      r.t = Math.min(1, r.t + dt / r.duration);
      const e = easeInOut(r.t);
      p.x = r.fromX + (r.toX - r.fromX) * e;
      p.z = r.fromZ + (r.toZ - r.fromZ) * e;
      p.speed = 0;
      p.running = false;
      p.heading = Math.atan2(r.toX - r.fromX, r.toZ - r.fromZ);
      g.visible = false;
      if (r.t >= 1) {
        // 降車：乗り場の少し横に降りる
        const st = STATIONS.find((s) => s.x === r.toX && s.z === r.toZ);
        const pos = { x: r.toX + 1.8, z: r.toZ + (st && st.z > 18 && st.z < 34 ? 0 : 1.2) };
        resolveCollision(pos, PLAYER_RADIUS, false);
        p.x = pos.x;
        p.z = pos.z;
        runtime.ride = null;
        useGame.getState().setRiding(false);
      }
      g.position.set(p.x, 0, p.z);
      return;
    }
    g.visible = true;

    // ---- 入力 ----
    let ix = 0;
    let iy = 0;
    let run = false;
    if (playing) {
      const k = runtime.input.keys;
      ix = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      iy = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      run = k.has('ShiftLeft') || k.has('ShiftRight');
      if (runtime.input.joyActive) {
        ix = runtime.input.joyX;
        iy = runtime.input.joyY;
        // 端まで倒すと走る
        run = Math.hypot(ix, iy) > 0.92;
      }
    }
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }

    // カメラの向きに対して移動する
    const yaw = runtime.camera.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    // 荷物やカートを持っているときは走れず、少しゆっくりになる
    if (runtime.carrying) run = false;
    const speed = runtime.carrying ? WALK_SPEED * 0.8 : run ? RUN_SPEED : WALK_SPEED;
    const tx = (rx * ix + fx * iy) * speed;
    const tz = (rz * ix + fz * iy) * speed;
    const v = velocity.current;
    const blend = 1 - Math.exp(-dt * 12);
    v.x += (tx - v.x) * blend;
    v.y += (tz - v.y) * blend;

    const prevX = p.x;
    const prevZ = p.z;
    const pos = { x: p.x + v.x * dt, z: p.z + v.y * dt };
    resolveCollision(pos, PLAYER_RADIUS, true);
    p.x = pos.x;
    p.z = pos.z;
    const moved = Math.hypot(p.x - prevX, p.z - prevZ);
    p.speed = dt > 0 ? moved / dt : 0;
    p.running = run && p.speed > WALK_SPEED * 0.8;

    if (Math.hypot(v.x, v.y) > 0.3) {
      const target = Math.atan2(v.x, v.y);
      let diff = target - p.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.heading += diff * (1 - Math.exp(-dt * 14));
    }

    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.heading;
    motion.current.speed = p.speed;
  });

  if (phase === 'title' || phase === 'ending' || phase === 'reveal') return null;

  return (
    <group ref={group} position={[runtime.player.x, 0, runtime.player.z]}>
      <Humanoid look={PLAYER_LOOK} motion={motion} />
    </group>
  );
}
