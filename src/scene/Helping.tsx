// 困りごとまわりの見た目：シェアカート置き場、荷物、散らばった箱、
// 呼ばれてくるロボット・ポッド・ドローン、付き添い先の光の輪。

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NPC_MAP } from '../data/npcs';
import { SHARE_STATIONS, TROUBLES, type TroubleDef } from '../data/troubles';
import { escortDestination } from '../game/helping';
import { runtime } from '../game/runtime';
import { useGame } from '../game/store';
import { GEO, glow, lambert } from './geometries';
import { GlowMarker } from './GlowMarker';
import { PodShape } from './Pod';

// ---- 形 ----

/** シェアカート（前が +z） */
function CartShape() {
  const frame = lambert('#3f8a5f');
  const metal = lambert('#c9ced4');
  return (
    <group>
      <mesh geometry={GEO.box} material={frame} position={[0, 0.55, 0]} scale={[0.72, 0.06, 0.95]} castShadow />
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} geometry={GEO.box} material={frame} position={[x, 0.78, 0]} scale={[0.05, 0.46, 0.95]} />
      ))}
      <mesh geometry={GEO.box} material={frame} position={[0, 0.78, 0.47]} scale={[0.72, 0.46, 0.05]} />
      <mesh geometry={GEO.box} material={frame} position={[0, 0.78, -0.47]} scale={[0.72, 0.46, 0.05]} />
      <mesh geometry={GEO.box} material={glow('#bff5c8')} position={[0, 1.0, 0.5]} scale={[0.4, 0.05, 0.01]} />
      {/* 取っ手 */}
      <mesh geometry={GEO.cylinderLow} material={metal} position={[0, 1.12, -0.6]} rotation={[0, 0, Math.PI / 2]} scale={[0.05, 0.7, 0.05]} />
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} geometry={GEO.cylinderLow} material={metal} position={[x, 0.9, -0.54]} rotation={[0.35, 0, 0]} scale={[0.04, 0.5, 0.04]} />
      ))}
      {[-0.3, 0.3].flatMap((x) =>
        [-0.36, 0.36].map((z) => (
          <mesh key={`${x}:${z}`} geometry={GEO.wheel} material={lambert('#23262c')} position={[x, 0.13, z]} scale={[0.06, 0.26, 0.26]} />
        )),
      )}
    </group>
  );
}

function Suitcase() {
  return (
    <group>
      <mesh geometry={GEO.roundedBox} material={lambert('#6b7fa3')} position={[0, 0.36, 0]} scale={[0.5, 0.66, 0.3]} castShadow />
      <mesh geometry={GEO.box} material={lambert('#2d3036')} position={[0, 0.74, 0]} scale={[0.22, 0.06, 0.06]} />
      <mesh geometry={GEO.box} material={lambert('#c49a6a')} position={[0.05, 0.9, 0]} scale={[0.4, 0.3, 0.3]} castShadow />
    </group>
  );
}

function BoxStack() {
  return (
    <group>
      <mesh geometry={GEO.box} material={lambert('#c49a6a')} position={[0, 0.22, 0]} scale={[0.6, 0.44, 0.5]} castShadow />
      <mesh geometry={GEO.box} material={lambert('#b0875a')} position={[0.03, 0.62, 0]} scale={[0.5, 0.36, 0.45]} rotation={[0, 0.2, 0]} castShadow />
      <mesh geometry={GEO.box} material={lambert('#d4ab78')} position={[-0.02, 0.94, 0]} scale={[0.4, 0.28, 0.38]} rotation={[0, -0.15, 0]} castShadow />
    </group>
  );
}

/** 呼ばれてくる荷物運びロボット */
function ServiceRobot() {
  return (
    <group>
      <mesh geometry={GEO.roundedBox} material={lambert('#f2f5f8')} position={[0, 0.6, 0]} scale={[0.9, 0.7, 1.1]} castShadow />
      <mesh geometry={GEO.box} material={lambert('#e8a33a')} position={[0, 0.5, 0]} scale={[0.92, 0.1, 1.12]} />
      <mesh geometry={GEO.box} material={lambert('#dfe4ea')} position={[0, 0.98, 0]} scale={[0.8, 0.06, 1.0]} />
      <mesh geometry={GEO.box} material={glow('#6fe3ff')} position={[0, 0.72, 0.56]} scale={[0.5, 0.1, 0.02]} />
      <mesh geometry={GEO.cylinderLow} material={lambert('#39414d')} position={[0, 1.2, 0.35]} scale={[0.04, 0.4, 0.04]} />
      <mesh geometry={GEO.sphereLow} material={glow('#6fe3ff')} position={[0, 1.42, 0.35]} scale={0.1} />
      {[-0.42, 0.42].flatMap((x) =>
        [-0.4, 0.4].map((z) => (
          <mesh key={`${x}:${z}`} geometry={GEO.wheel} material={lambert('#1c1d21')} position={[x, 0.18, z]} scale={[0.1, 0.36, 0.36]} />
        )),
      )}
    </group>
  );
}

/** 冷却ミストのドローン */
function MistDrone({ spraying }: { spraying: React.MutableRefObject<boolean> }) {
  const rotors = useRef<THREE.Group>(null);
  const mist = useRef<THREE.Mesh>(null);
  const mistMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }, dt) => {
    rotors.current?.children.forEach((r) => (r.rotation.y += Math.min(dt, 0.1) * 30));
    if (mist.current && mistMat.current) {
      mist.current.visible = spraying.current;
      const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.06;
      mist.current.scale.set(2.4 * s, 3, 2.4 * s);
      mistMat.current.opacity = 0.22 + Math.sin(clock.elapsedTime * 4) * 0.06;
    }
  });
  return (
    <group>
      <mesh geometry={GEO.roundedBox} material={lambert('#f2f5f8')} scale={[0.7, 0.22, 0.7]} castShadow />
      <mesh geometry={GEO.sphereLow} material={glow('#6fe3ff')} position={[0, -0.14, 0]} scale={0.16} />
      <group ref={rotors}>
        {[
          [0.55, 0.55],
          [-0.55, 0.55],
          [0.55, -0.55],
          [-0.55, -0.55],
        ].map(([x, z]) => (
          <group key={`${x}:${z}`} position={[x, 0.12, z]}>
            <mesh geometry={GEO.box} material={lambert('#39414d')} scale={[0.5, 0.02, 0.06]} />
          </group>
        ))}
      </group>
      <mesh ref={mist} geometry={GEO.cone} position={[0, -1.7, 0]} rotation={[Math.PI, 0, 0]} visible={false}>
        <meshBasicMaterial ref={mistMat} color="#dff4ff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---- 困りごとごとの見た目 ----

function TroubleVisuals({ t }: { t: TroubleDef }) {
  const luggage = useRef<THREE.Group>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  const robot = useRef<THREE.Group>(null);
  const pod = useRef<THREE.Group>(null);
  const drone = useRef<THREE.Group>(null);
  const cart = useRef<THREE.Group>(null);
  const spraying = useRef(false);
  const [hx, hz] = NPC_MAP[t.npcId].position;
  const origin = useRef({ x: hx + 0.85, z: hz + 0.35 });

  useFrame(({ clock }) => {
    const st = runtime.troubles[t.id];
    const p = runtime.player;

    // 荷物
    const lg = luggage.current;
    if (lg) {
      lg.visible = st.luggage !== 'gone' && !(t.item === 'boxes' && st.luggage === 'ground');
      const hold = (x: number, z: number, h: number, y: number) => {
        lg.position.set(x + Math.sin(h) * 0.5, y, z + Math.cos(h) * 0.5);
        lg.rotation.y = h;
      };
      if (st.luggage === 'ground') {
        lg.position.set(origin.current.x, 0, origin.current.z);
      } else if (st.luggage === 'player') {
        hold(p.x, p.z, p.heading, 0.55);
      } else if (st.luggage === 'npc') {
        const n = runtime.npcPos[t.npcId];
        hold(n.x, n.z, n.h, 0.45);
      } else if (st.luggage === 'helper' && t.neighbor) {
        const n = runtime.npcPos[t.neighbor.helperId];
        hold(n.x, n.z, n.h, 0.45);
      } else if (st.luggage === 'robot' && st.vehicle) {
        lg.position.set(st.vehicle.x, 1.0, st.vehicle.z);
        lg.rotation.y = st.vehicle.heading;
      } else if (st.luggage === 'cart') {
        const n = runtime.npcPos[t.npcId];
        lg.position.set(n.x + Math.sin(n.h) * 1.1, 0.58, n.z + Math.cos(n.h) * 1.1);
        lg.rotation.y = n.h;
        lg.scale.setScalar(0.8);
      } else if (st.luggage === 'placed') {
        const [dx, dz] = t.route[t.route.length - 1];
        lg.position.set(dx + 0.7, 0, dz + 0.2);
        lg.scale.setScalar(1);
      }
    }

    // 散らばった箱
    items.current.forEach((g, i) => {
      if (!g) return;
      g.visible = st.luggage === 'ground' && !st.collected[i];
      const focused = runtime.focus?.kind === 'item' && runtime.focus.id === `${t.id}:${i}`;
      g.position.y = focused ? 0.12 + Math.sin(clock.elapsedTime * 6) * 0.05 : 0;
    });

    // 乗り物
    const v = st.vehicle;
    const place = (g: THREE.Group | null, kind: string) => {
      if (!g) return;
      g.visible = !!v && v.visible && v.kind === kind;
      if (v && g.visible) {
        g.position.set(v.x, v.y + (kind === 'drone' ? Math.sin(clock.elapsedTime * 3) * 0.15 : 0), v.z);
        g.rotation.y = v.heading;
      }
    };
    place(robot.current, 'robot');
    place(pod.current, 'pod');
    place(drone.current, 'drone');
    if (v && v.kind === 'drone' && st.stage !== 'approach') v.y = Math.max(v.y, 3.4);
    if (v && v.kind === 'drone' && st.stage === 'approach') v.y += (3.4 - v.y) * 0.02;
    spraying.current = st.stage === 'service';

    // 困っている人が押すカート・置かれたカート
    const c = cart.current;
    if (c) {
      if (st.cartWithNpc) {
        const n = runtime.npcPos[t.npcId];
        c.visible = true;
        c.position.set(n.x + Math.sin(n.h) * 1.1, 0, n.z + Math.cos(n.h) * 1.1);
        c.rotation.y = n.h;
      } else if (st.cartParked) {
        c.visible = true;
        c.position.set(st.cartParked[0], 0, st.cartParked[1]);
      } else {
        c.visible = false;
      }
    }
  });

  return (
    <group>
      <group ref={luggage}>{t.item === 'suitcase' ? <Suitcase /> : <BoxStack />}</group>
      {(t.hand.items ?? []).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <group
            ref={(g) => {
              items.current[i] = g;
            }}
            rotation={[0, i * 1.3, 0]}
          >
            <mesh geometry={GEO.box} material={lambert(i % 2 ? '#c49a6a' : '#b0875a')} position={[0, 0.2, 0]} scale={[0.55, 0.4, 0.45]} castShadow />
            <mesh geometry={GEO.box} material={lambert('#e8dcc4')} position={[0, 0.41, 0]} scale={[0.1, 0.02, 0.46]} />
          </group>
        </group>
      ))}
      <group ref={robot} visible={false}>
        <ServiceRobot />
      </group>
      <group ref={pod} visible={false}>
        <PodShape color="#ffffff" />
      </group>
      <group ref={drone} visible={false}>
        <MistDrone spraying={spraying} />
      </group>
      <group ref={cart} visible={false}>
        <CartShape />
      </group>
    </group>
  );
}

/** シェアカート置き場 */
function ShareStationView({ x, z, rot }: { x: number; z: number; rot: number }) {
  const phase = useGame((s) => s.phase);
  const post = lambert('#3f8a5f');
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh geometry={GEO.box} material={lambert('#d7dcd2')} position={[0, 0.04, 0]} scale={[2.8, 0.08, 1.8]} receiveShadow />
      <mesh geometry={GEO.box} material={post} position={[0, 2.3, -0.7]} scale={[2.8, 0.1, 1.0]} castShadow />
      {[-1.3, 1.3].map((px) => (
        <mesh key={px} geometry={GEO.cylinder} material={post} position={[px, 1.15, -0.8]} scale={[0.1, 2.3, 0.1]} castShadow />
      ))}
      <mesh geometry={GEO.box} material={lambert('#2b3440')} position={[1.25, 1.4, -0.3]} scale={[0.1, 0.8, 0.6]} />
      <mesh geometry={GEO.box} material={glow('#bff5c8')} position={[1.19, 1.4, -0.3]} scale={[0.02, 0.6, 0.45]} />
      <group position={[-0.6, 0, 0.1]}>
        <CartShape />
      </group>
      <group position={[0.35, 0, 0.1]}>
        <CartShape />
      </group>
      {phase === 'playing' && <GlowMarker position={[0, 0.12, 0.3]} radius={1.6} color="#bff5c8" speed={1.8} />}
    </group>
  );
}

/** プレイヤーが押しているカート */
function PlayerCart() {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const group = g.current;
    if (!group) return;
    const p = runtime.player;
    group.visible = runtime.carrying?.kind === 'cart' && runtime.ride === null;
    group.position.set(p.x + Math.sin(p.heading) * 1.05, 0, p.z + Math.cos(p.heading) * 1.05);
    group.rotation.y = p.heading;
  });
  return (
    <group ref={g} visible={false}>
      <CartShape />
    </group>
  );
}

/** 付き添っている目的地の光の輪 */
function DestinationMarker() {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const group = g.current;
    if (!group) return;
    const d = escortDestination();
    group.visible = d !== null;
    if (d) group.position.set(d[0], 0, d[1]);
  });
  return (
    <group ref={g} visible={false}>
      <GlowMarker position={[0, 0.12, 0]} radius={1.8} color="#ffe7a8" speed={2.4} />
    </group>
  );
}

export function Helping() {
  const future = useGame((s) => s.future);
  const phase = useGame((s) => s.phase);
  if (future || phase === 'reveal') return null;
  return (
    <group>
      {SHARE_STATIONS.map((s) => (
        <ShareStationView key={s.id} x={s.x} z={s.z} rot={s.rot} />
      ))}
      {TROUBLES.map((t) => (
        <TroubleVisuals key={t.id} t={t} />
      ))}
      <PlayerCart />
      <DestinationMarker />
    </group>
  );
}
