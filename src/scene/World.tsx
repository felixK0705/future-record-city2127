// 3D ワールド：Canvas、空と光、カメラ、毎フレームの更新処理

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ENDING_MAP } from '../data/endings';
import { BUILDINGS, CLOCK_TOWER, LITTER, STATIONS, TERMINALS, TREES } from '../game/cityData';
import { SHARE_STATIONS } from '../data/troubles';
import { itemPosition, updateHelping } from '../game/helping';
import { interact, updateDialog, updateFocus, updatePanel } from '../game/interaction';
import { runtime } from '../game/runtime';
import { useGame } from '../game/store';
import { updateTracker } from '../game/tracker';
import { City } from './City';
import { FutureLayer } from './FutureLayer';
import { Helping } from './Helping';
import { Litter } from './Litter';
import { Npcs } from './Npc';
import { Pods } from './Pod';
import { Player } from './Player';
import { Scenery, skyUniforms } from './Scenery';
import styles from './World.module.css';

const PRESENT = { sky: '#7fb3e0', fog: '#d6e0e6', light: '#fff0da' };
const LEAP = { sky: '#0b0e1c', fog: '#262b40', light: '#8a90b8' };

/** 影の解像度（スマートフォンでは軽くする） */
const SHADOW_SIZE = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 ? 1024 : 2048;

/** 空の色・霧・光を状態に合わせてゆっくり変え、太陽の影をプレイヤーの周りに落とす */
function Atmosphere() {
  const { scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useRef({ sky: new THREE.Color(), fog: new THREE.Color(), light: new THREE.Color() });
  const extent = useRef(0);

  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    scene.add(light.target);
    return () => {
      scene.remove(light.target);
    };
  }, [scene]);

  useFrame((_, dt) => {
    const s = useGame.getState();
    const t = target.current;
    let palette = PRESENT;
    if (s.future && s.result) {
      const e = ENDING_MAP[s.result.endingId];
      palette = { sky: e.skyColor, fog: e.fogColor, light: e.lightColor };
    } else if (s.phase === 'timeleap') {
      palette = LEAP;
    }
    t.sky.set(palette.sky);
    t.fog.set(palette.fog);
    t.light.set(palette.light);
    const k = 1 - Math.exp(-dt * (s.phase === 'timeleap' ? 1.5 : 3));
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color(palette.fog);
    (scene.background as THREE.Color).lerp(t.fog, k);
    skyUniforms.topColor.value.lerp(t.sky, k);
    skyUniforms.horizonColor.value.lerp(t.fog, k);
    if (!scene.fog) scene.fog = new THREE.Fog(palette.fog, 60, 240);
    const fog = scene.fog as THREE.Fog;
    fog.color.lerp(t.fog, k);
    const playing = s.phase === 'playing';
    fog.far += ((playing ? 240 : 340) - fog.far) * k;
    fog.near += ((playing ? 55 : 110) - fog.near) * k;
    hemi.current?.color.lerp(t.sky, k * 0.5);

    const light = sun.current;
    if (light) {
      light.color.lerp(t.light, k);
      // 影を落とす範囲をプレイヤー（または街全体）に合わせる
      const cx = playing ? Math.round(runtime.player.x) : 0;
      const cz = playing ? Math.round(runtime.player.z) : 0;
      light.position.set(cx + 45, 80, cz + 32);
      light.target.position.set(cx, 0, cz);
      light.target.updateMatrixWorld();
      const ext = playing ? 40 : 90;
      if (extent.current !== ext) {
        extent.current = ext;
        const cam = light.shadow.camera;
        cam.left = -ext;
        cam.right = ext;
        cam.top = ext;
        cam.bottom = -ext;
        cam.near = 1;
        cam.far = 260;
        cam.updateProjectionMatrix();
      }
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#dfeaf5', '#7d7466', 0.95]} />
      <directionalLight
        ref={sun}
        position={[45, 80, 32]}
        intensity={1.75}
        castShadow
        shadow-mapSize={[SHADOW_SIZE, SHADOW_SIZE]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <ambientLight intensity={0.18} />
    </>
  );
}

/** カメラの手前に建物があるときは距離を縮める */
function clampCameraDistance(px: number, pz: number, dx: number, dy: number, dz: number, dist: number): number {
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const x = px + dx * dist * k;
    const z = pz + dz * dist * k;
    const y = 1.4 + dy * dist * k;
    for (const b of BUILDINGS) {
      const top = b.kind === 'stall' ? 3.2 : b.h + 0.5;
      if (y < top && Math.abs(x - b.x) < b.w / 2 + 0.3 && Math.abs(z - b.z) < b.d / 2 + 0.3) {
        return Math.max(2.2, dist * (k - 1 / steps));
      }
    }
    for (const t of TREES) {
      const r = 2 * t.scale;
      if (y > 1.8 * t.scale && y < 5.4 * t.scale && Math.abs(x - t.x) < r && Math.abs(z - t.z) < r) {
        return Math.max(2.2, dist * (k - 1 / steps));
      }
    }
  }
  return dist;
}

const lookTarget = new THREE.Vector3();
const desired = new THREE.Vector3();

function CameraRig() {
  const smoothDist = useRef(8);
  const look = useRef(new THREE.Vector3(0, 4, 0));

  useFrame(({ camera, clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useGame.getState();
    const t = clock.elapsedTime;

    if (s.phase === 'playing') {
      const p = runtime.player;
      const { yaw, pitch, dist } = runtime.camera;
      const dx = Math.sin(yaw) * Math.cos(pitch);
      const dy = Math.sin(pitch);
      const dz = Math.cos(yaw) * Math.cos(pitch);
      const riding = runtime.ride !== null;
      const want = riding ? dist + 4 : clampCameraDistance(p.x, p.z, dx, dy, dz, dist);
      smoothDist.current += (want - smoothDist.current) * (1 - Math.exp(-dt * (want < smoothDist.current ? 14 : 3)));
      const d = smoothDist.current;
      const lift = riding ? Math.sin(Math.PI * (runtime.ride?.t ?? 0)) * 3.5 : 0;
      desired.set(p.x + dx * d, 1.4 + lift + dy * d, p.z + dz * d);
      camera.position.lerp(desired, 1 - Math.exp(-dt * 10));
      lookTarget.set(p.x, 1.4 + lift, p.z);
      look.current.lerp(lookTarget, 1 - Math.exp(-dt * 12));
    } else if (s.phase === 'title') {
      const a = t * 0.04;
      desired.set(Math.cos(a) * 62, 30, Math.sin(a) * 62);
      camera.position.lerp(desired, 1 - Math.exp(-dt * 2));
      look.current.lerp(lookTarget.set(0, 4, 0), 1 - Math.exp(-dt * 2));
    } else if (s.phase === 'timeleap') {
      desired.set(0, 105, 80);
      camera.position.lerp(desired, 1 - Math.exp(-dt * 0.9));
      look.current.lerp(lookTarget.set(0, 0, 0), 1 - Math.exp(-dt * 1.5));
    } else {
      const high = s.result?.endingId === 'sky' ? 62 : 44;
      const a = t * 0.05;
      desired.set(Math.cos(a) * 82, high, Math.sin(a) * 82);
      camera.position.lerp(desired, 1 - Math.exp(-dt * 1.2));
      look.current.lerp(lookTarget.set(0, s.result?.endingId === 'sky' ? 18 : 8, 0), 1 - Math.exp(-dt * 1.5));
    }
    camera.lookAt(look.current);
  });
  return null;
}

/** 注目中の対象の足元に光る輪を出す */
function FocusRing() {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m) return;
    const f = runtime.focus;
    if (!f || useGame.getState().phase !== 'playing') {
      m.visible = false;
      return;
    }
    let x = 0;
    let z = 0;
    let r = 1;
    if (f.kind === 'npc') {
      const p = runtime.npcPos[f.id];
      x = p.x;
      z = p.z;
    } else if (f.kind === 'litter') {
      const l = LITTER[Number(f.id)];
      x = l.x;
      z = l.z;
      r = 0.7;
    } else if (f.kind === 'station') {
      const st = STATIONS.find((v) => v.id === f.id)!;
      x = st.x;
      z = st.z;
      r = 2.2;
    } else if (f.kind === 'item') {
      const ip = itemPosition(f.id);
      if (!ip) return;
      x = ip[0];
      z = ip[1];
      r = 0.7;
    } else if (f.kind === 'share') {
      const sh = SHARE_STATIONS.find((v) => v.id === f.id)!;
      x = sh.x;
      z = sh.z;
      r = 1.8;
    } else if (f.kind === 'terminal') {
      const te = TERMINALS.find((v) => v.id === f.id)!;
      x = te.x;
      z = te.z;
    } else {
      x = CLOCK_TOWER.x;
      z = CLOCK_TOWER.z + CLOCK_TOWER.size / 2 + 2;
      r = 1.8;
    }
    m.visible = true;
    const pulse = r * (1 + Math.sin(clock.elapsedTime * 5) * 0.08);
    m.position.set(x, 0.1, z);
    m.scale.set(pulse, pulse, pulse);
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.85, 1, 40]} />
      <meshBasicMaterial color="#fff6d8" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** 毎フレームの更新（行動記録・操作対象の検出・吹き出しの管理） */
function GameLoop() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    if (useGame.getState().phase !== 'playing') return;
    updateTracker(dt);
    updateHelping(dt);
    updateFocus();
    updateDialog();
    updatePanel();
    if (runtime.input.interactQueued) {
      runtime.input.interactQueued = false;
      interact();
    }
  });
  return null;
}

export function World() {
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (useGame.getState().phase !== 'playing' || drag.current) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    const cam = runtime.camera;
    cam.yaw -= dx * 0.006;
    cam.pitch = Math.max(0.08, Math.min(1.15, cam.pitch + dy * 0.004));
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  return (
    <div
      className={styles.world}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas
        flat
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 55, near: 0.1, far: 900, position: [60, 30, 0] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Atmosphere />
        <Scenery />
        <CameraRig />
        <GameLoop />
        <City />
        <Litter />
        <Npcs />
        <Pods />
        <Helping />
        <Player />
        <FocusRing />
        <FutureLayer />
      </Canvas>
    </div>
  );
}
