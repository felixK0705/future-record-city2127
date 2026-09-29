// InstancedMesh を宣言的に使うための小さな部品

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

export interface InstanceSpec {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry?: number;
  rx?: number;
  rz?: number;
  color: string;
}

interface Props {
  specs: InstanceSpec[];
  /** 共有ジオメトリ（children で渡す代わりに使える） */
  geometry?: THREE.BufferGeometry;
  children?: ReactNode;
  /** 全体をこの色に寄せる（未来の街の染色） */
  tint?: string | null;
  tintAmount?: number;
  /** 発光させる（MeshBasicMaterial を使う） */
  unlit?: boolean;
  visible?: boolean;
  transparent?: boolean;
  opacity?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

const dummy = new THREE.Object3D();
const color = new THREE.Color();
const tintColor = new THREE.Color();

export function Instanced({
  specs,
  geometry,
  children,
  tint = null,
  tintAmount = 0.5,
  unlit = false,
  visible = true,
  transparent = false,
  opacity = 1,
  castShadow = true,
  receiveShadow = true,
}: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    if (tint) tintColor.set(tint);
    specs.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(s.rx ?? 0, s.ry ?? 0, s.rz ?? 0);
      dummy.scale.set(s.sx, s.sy, s.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(s.color);
      if (tint) color.lerp(tintColor, tintAmount);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [specs, tint, tintAmount]);

  if (specs.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, specs.length]}
      visible={visible}
      castShadow={castShadow && !unlit && !transparent}
      receiveShadow={receiveShadow && !unlit}
    >
      {children}
      {unlit ? (
        <meshBasicMaterial transparent={transparent} opacity={opacity} toneMapped={false} />
      ) : (
        <meshLambertMaterial transparent={transparent} opacity={opacity} />
      )}
    </instancedMesh>
  );
}
