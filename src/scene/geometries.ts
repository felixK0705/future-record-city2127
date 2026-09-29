// 共有のジオメトリとマテリアル。同じ形・同じ色は一つだけ作って使い回す。

import * as THREE from 'three';

/** 切妻屋根の妻壁などに使う三角柱（底辺 x:-0.5〜0.5、頂点 y=1、奥行き z:-0.5〜0.5） */
function makeGable(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 1);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.computeVertexNormals();
  return g;
}

/** 角の丸い箱（車体や人の胴に使う） */
function makeRoundedBox(radius = 0.18, segments = 3): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const w = 1;
  const h = 1;
  const r = radius;
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: segments });
  g.translate(0, 0, -0.5);
  g.computeVertexNormals();
  return g;
}

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  gable: makeGable(),
  roundedBox: makeRoundedBox(0.2, 3),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cylinderLow: new THREE.CylinderGeometry(0.5, 0.5, 1, 7),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
  coneLow: new THREE.ConeGeometry(0.5, 1, 6),
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
  sphereLow: new THREE.SphereGeometry(0.5, 8, 6),
  blob: new THREE.IcosahedronGeometry(0.5, 1),
  rock: new THREE.IcosahedronGeometry(0.5, 0),
  wheel: new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateZ(Math.PI / 2),
  limb: new THREE.CapsuleGeometry(0.5, 1, 4, 8),
  torso: new THREE.CapsuleGeometry(0.5, 0.6, 4, 12),
  hemisphere: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  ring: new THREE.TorusGeometry(0.5, 0.06, 6, 24),
};

const lambertCache = new Map<string, THREE.MeshLambertMaterial>();
const basicCache = new Map<string, THREE.MeshBasicMaterial>();

/** 光を受ける色つきマテリアル（色ごとに共有） */
export function lambert(color: string): THREE.MeshLambertMaterial {
  let m = lambertCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    lambertCache.set(color, m);
  }
  return m;
}

/** 自ら光って見えるマテリアル（ライト・画面など） */
export function glow(color: string): THREE.MeshBasicMaterial {
  let m = basicCache.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    basicCache.set(color, m);
  }
  return m;
}
