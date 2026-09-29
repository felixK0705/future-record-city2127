// 大通りの渋滞：車種ごとに形の違う車を、部品単位の InstancedMesh で描く

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAR_LANES, CAR_SPACING, CAR_TYPES, carTypeOf, type CarType } from '../game/cityData';
import { runtime } from '../game/runtime';
import { GEO } from './geometries';

/** 部品の種類 */
type PartKind = 'body' | 'cabin' | 'glass' | 'wheel' | 'head' | 'tail' | 'dark';

interface LocalPart {
  kind: PartKind;
  m: THREE.Matrix4;
}

const m4 = (x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

/** 車種ごとの部品配置（車の中心が原点、+x が前） */
function partsFor(type: CarType): LocalPart[] {
  const { l, w, h } = CAR_TYPES[type];
  const out: LocalPart[] = [];
  const wheelR = type === 'truck' ? 0.44 : type === 'kei' ? 0.3 : 0.34;
  const bodyH = type === 'truck' ? 1.0 : type === 'van' ? h * 0.55 : 0.62;
  const bodyY = wheelR + bodyH / 2 - 0.05;
  out.push({ kind: 'body', m: m4(0, bodyY, 0, l, bodyH, w) });

  if (type === 'truck') {
    // 運転席と荷台
    out.push({ kind: 'cabin', m: m4(l * 0.33, bodyY + 0.9, 0, l * 0.3, 1.0, w * 0.96) });
    out.push({ kind: 'glass', m: m4(l * 0.33 + 0.02, bodyY + 1.0, 0, l * 0.3 + 0.02, 0.55, w * 0.9) });
    out.push({ kind: 'dark', m: m4(-l * 0.15, bodyY + 1.05, 0, l * 0.66, 1.6, w) });
  } else {
    const cabinL = type === 'kei' ? l * 0.72 : type === 'van' ? l * 0.84 : l * 0.52;
    const cabinH = type === 'van' ? h - bodyH - wheelR + 0.05 : h - bodyH - wheelR + 0.05;
    const cabinX = type === 'van' || type === 'kei' ? -l * 0.06 : -l * 0.05;
    const cy = bodyY + bodyH / 2 + cabinH / 2 - 0.02;
    out.push({ kind: 'cabin', m: m4(cabinX, cy, 0, cabinL, cabinH, w * 0.88) });
    out.push({ kind: 'glass', m: m4(cabinX, cy + 0.02, 0, cabinL + 0.04, cabinH * 0.6, w * 0.9) });
    if (type === 'taxi') out.push({ kind: 'head', m: m4(cabinX, cy + cabinH / 2 + 0.1, 0, 0.5, 0.18, 0.22) });
  }
  // 車輪
  const wx = l / 2 - (type === 'kei' ? 0.55 : 0.8);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.push({ kind: 'wheel', m: m4(sx * wx, wheelR, sz * (w / 2 - 0.12), wheelR * 2, 0.26, wheelR * 2) });
    }
  }
  // 灯火とバンパー
  for (const sz of [-1, 1]) {
    out.push({ kind: 'head', m: m4(l / 2 + 0.01, bodyY + 0.08, sz * w * 0.33, 0.04, 0.14, 0.34) });
    out.push({ kind: 'tail', m: m4(-l / 2 - 0.01, bodyY + 0.1, sz * w * 0.36, 0.04, 0.16, 0.28) });
  }
  out.push({ kind: 'dark', m: m4(l / 2 + 0.03, wheelR + 0.08, 0, 0.1, 0.18, w * 0.98) });
  out.push({ kind: 'dark', m: m4(-l / 2 - 0.03, wheelR + 0.08, 0, 0.1, 0.18, w * 0.98) });
  return out;
}

const PARTS: Record<CarType, LocalPart[]> = {
  sedan: partsFor('sedan'),
  kei: partsFor('kei'),
  van: partsFor('van'),
  taxi: partsFor('taxi'),
  truck: partsFor('truck'),
};

const CAR_COLORS = ['#e8e8e6', '#2f3a4a', '#b33a3a', '#f4f2ec', '#4a6fa5', '#7a7f87', '#1e2228', '#a9b7c4', '#2e5e4e', '#d9c9a8'];
const TAXI_COLOR = '#f2c23a';
const TRUCK_BOX = '#eef0f2';

const KIND_ORDER: PartKind[] = ['body', 'cabin', 'glass', 'wheel', 'head', 'tail', 'dark'];

export function Traffic() {
  const perLane = Math.ceil(124 / CAR_SPACING);
  const count = runtime.carCount;
  const offsets = useRef(CAR_LANES.map(() => 0));
  const meshes = useRef<Partial<Record<PartKind, THREE.InstancedMesh | null>>>({});

  // 部品の種類ごとの総数と、車ごとの書き込み位置
  const layout = useMemo(() => {
    const counts: Record<PartKind, number> = { body: 0, cabin: 0, glass: 0, wheel: 0, head: 0, tail: 0, dark: 0 };
    const slots: { kind: PartKind; slot: number; m: THREE.Matrix4 }[][] = [];
    for (let i = 0; i < count; i++) {
      const parts = PARTS[carTypeOf(i)];
      slots.push(parts.map((p) => ({ kind: p.kind, slot: counts[p.kind]++, m: p.m })));
    }
    return { counts, slots };
  }, [count]);

  useLayoutEffect(() => {
    const c = new THREE.Color();
    const body = meshes.current.body;
    const cabin = meshes.current.cabin;
    for (let i = 0; i < count; i++) {
      const type = carTypeOf(i);
      const col = type === 'taxi' ? TAXI_COLOR : CAR_COLORS[(i * 7 + 2) % CAR_COLORS.length];
      for (const s of layout.slots[i]) {
        if (s.kind === 'body' && body) body.setColorAt(s.slot, c.set(col));
        if (s.kind === 'cabin' && cabin) cabin.setColorAt(s.slot, c.set(type === 'truck' ? '#f4f4f2' : col));
        if (s.kind === 'dark' && type === 'truck' && s.m.elements[13] > 1) {
          // 荷台の箱は白
          meshes.current.dark?.setColorAt(s.slot, c.set(TRUCK_BOX));
        } else if (s.kind === 'dark') {
          meshes.current.dark?.setColorAt(s.slot, c.set('#2a2c31'));
        }
      }
    }
    for (const k of ['body', 'cabin', 'dark'] as PartKind[]) {
      const mesh = meshes.current[k];
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [count, layout]);

  const carMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tmp = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    CAR_LANES.forEach((lane, li) => {
      // 少し進んでは止まる、の繰り返し
      const speed = Math.max(0, Math.sin(clock.elapsedTime * 0.55 + li * 2.1)) * 1.8;
      offsets.current[li] += speed * dt * lane.dir;
      q.setFromAxisAngle(up, lane.dir > 0 ? 0 : Math.PI);
      for (let i = 0; i < perLane; i++) {
        const idx = li * perLane + i;
        let x = -62 + i * CAR_SPACING + offsets.current[li];
        x = ((((x + 62) % 124) + 124) % 124) - 62;
        runtime.cars[idx * 2] = x;
        runtime.cars[idx * 2 + 1] = lane.z;
        // 止まっている間のわずかな揺れ
        pos.set(x, Math.sin(clock.elapsedTime * 9 + idx) * 0.006, lane.z);
        carMatrix.compose(pos, q, one);
        for (const s of layout.slots[idx]) {
          tmp.multiplyMatrices(carMatrix, s.m);
          meshes.current[s.kind]?.setMatrixAt(s.slot, tmp);
        }
      }
    });
    for (const k of KIND_ORDER) {
      const mesh = meshes.current[k];
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  });

  const setRef = (k: PartKind) => (m: THREE.InstancedMesh | null) => {
    meshes.current[k] = m;
  };

  return (
    <group>
      <instancedMesh ref={setRef('body')} args={[GEO.roundedBox, undefined, layout.counts.body]} frustumCulled={false} castShadow receiveShadow>
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={setRef('cabin')} args={[GEO.roundedBox, undefined, layout.counts.cabin]} frustumCulled={false} castShadow>
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={setRef('glass')} args={[GEO.box, undefined, layout.counts.glass]} frustumCulled={false}>
        <meshLambertMaterial color="#2c3a4a" />
      </instancedMesh>
      <instancedMesh ref={setRef('wheel')} args={[GEO.wheel, undefined, layout.counts.wheel]} frustumCulled={false}>
        <meshLambertMaterial color="#1c1d21" />
      </instancedMesh>
      <instancedMesh ref={setRef('head')} args={[GEO.box, undefined, layout.counts.head]} frustumCulled={false}>
        <meshBasicMaterial color="#fff6d8" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={setRef('tail')} args={[GEO.box, undefined, layout.counts.tail]} frustumCulled={false}>
        <meshBasicMaterial color="#ff3b30" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={setRef('dark')} args={[GEO.box, undefined, layout.counts.dark]} frustumCulled={false} castShadow>
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  );
}
