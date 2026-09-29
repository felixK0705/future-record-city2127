// 地面に散らばるごみ（空き缶・ペットボトル・袋を InstancedMesh で描く）。拾われたものは消える。

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LITTER } from '../game/cityData';
import { runtime } from '../game/runtime';
import { useGame } from '../game/store';
import { GEO } from './geometries';

const dummy = new THREE.Object3D();
const color = new THREE.Color();

type LitterKind = 'can' | 'bottle' | 'bag';
const KINDS: LitterKind[] = ['can', 'bottle', 'bag'];

/** ごみの種類ごとの形と大きさ */
const SHAPE: Record<LitterKind, { sx: number; sy: number; sz: number; lie: boolean }> = {
  can: { sx: 0.16, sy: 0.3, sz: 0.16, lie: true },
  bottle: { sx: 0.15, sy: 0.22, sz: 0.15, lie: true },
  bag: { sx: 0.55, sy: 0.32, sz: 0.5, lie: false },
};

const kindOf = (i: number): LitterKind => KINDS[i % KINDS.length];

function writeMatrices(meshes: Record<LitterKind, THREE.InstancedMesh | null>, indices: Record<LitterKind, number[]>, t: number) {
  for (const kind of KINDS) {
    const mesh = meshes[kind];
    if (!mesh) continue;
    const shape = SHAPE[kind];
    indices[kind].forEach((li, slot) => {
      const l = LITTER[li];
      const picked = runtime.litter[li]?.picked ?? false;
      const focused = runtime.focus?.kind === 'litter' && runtime.focus.id === String(li);
      const k = picked ? 0 : focused ? 1.25 + Math.sin(t * 6) * 0.1 : 1;
      dummy.position.set(l.x, picked ? -5 : (shape.lie ? shape.sx / 2 : shape.sy / 2) + (focused ? 0.15 : 0), l.z);
      dummy.rotation.set(shape.lie ? Math.PI / 2 : 0, l.rot, shape.lie ? l.rot : 0, 'YXZ');
      dummy.scale.set(shape.sx * k, shape.sy * k, shape.sz * k);
      dummy.updateMatrix();
      mesh.setMatrixAt(slot, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

export function Litter() {
  const meshes = useRef<Record<LitterKind, THREE.InstancedMesh | null>>({ can: null, bottle: null, bag: null });
  const future = useGame((s) => s.future);
  const lastVersion = useRef(-1);
  const lastFocus = useRef<string | null>(null);

  const indices = useMemo(() => {
    const out: Record<LitterKind, number[]> = { can: [], bottle: [], bag: [] };
    LITTER.forEach((_, i) => out[kindOf(i)].push(i));
    return out;
  }, []);

  useLayoutEffect(() => {
    for (const kind of KINDS) {
      const mesh = meshes.current[kind];
      if (!mesh) continue;
      indices[kind].forEach((li, slot) => {
        const base = kind === 'bottle' ? '#cfe6f2' : kind === 'bag' ? (li % 2 ? '#f2f0ea' : '#c8b8a6') : LITTER[li].color;
        mesh.setColorAt(slot, color.set(base));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    writeMatrices(meshes.current, indices, 0);
  }, [indices]);

  useFrame(({ clock }) => {
    const focusKey = runtime.focus?.kind === 'litter' ? runtime.focus.id : null;
    // 変化があったときと、注目中のごみが揺れている間だけ更新する
    if (runtime.litterVersion !== lastVersion.current || focusKey !== lastFocus.current || focusKey !== null) {
      lastVersion.current = runtime.litterVersion;
      lastFocus.current = focusKey;
      writeMatrices(meshes.current, indices, clock.elapsedTime);
    }
  });

  if (future) return null;
  const geo: Record<LitterKind, THREE.BufferGeometry> = { can: GEO.cylinder, bottle: GEO.limb, bag: GEO.rock };
  return (
    <group>
      {KINDS.map((kind) => (
        <instancedMesh
          key={kind}
          ref={(m) => {
            meshes.current[kind] = m;
          }}
          args={[geo[kind], undefined, indices[kind].length]}
          frustumCulled={false}
          castShadow
        >
          <meshLambertMaterial emissive="#2a2a22" transparent={kind === 'bottle'} opacity={kind === 'bottle' ? 0.8 : 1} />
        </instancedMesh>
      ))}
    </group>
  );
}
