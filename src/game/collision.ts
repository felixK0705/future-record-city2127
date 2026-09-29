// 円（プレイヤー）と箱（建物・車）の当たり判定

import { WORLD_HALF } from '../data/zones';
import { CAR_TYPES, COLLIDERS, carTypeOf, type Aabb } from './cityData';
import { runtime } from './runtime';

function pushOut(pos: { x: number; z: number }, r: number, box: Aabb) {
  const [x0, z0, x1, z1] = box;
  const cx = Math.max(x0, Math.min(pos.x, x1));
  const cz = Math.max(z0, Math.min(pos.z, z1));
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    pos.x = cx + (dx / d) * r;
    pos.z = cz + (dz / d) * r;
  } else {
    // 中心が箱の中に入ってしまった場合は最短の辺へ押し出す
    const left = pos.x - x0;
    const right = x1 - pos.x;
    const top = pos.z - z0;
    const bottom = z1 - pos.z;
    const m = Math.min(left, right, top, bottom);
    if (m === left) pos.x = x0 - r;
    else if (m === right) pos.x = x1 + r;
    else if (m === top) pos.z = z0 - r;
    else pos.z = z1 + r;
  }
}

const carBox: Aabb = [0, 0, 0, 0];

/** 位置を当たり判定で補正する（2回反復して角での引っかかりを減らす） */
export function resolveCollision(pos: { x: number; z: number }, r: number, withCars: boolean): void {
  for (let iter = 0; iter < 2; iter++) {
    for (const box of COLLIDERS) pushOut(pos, r, box);
    if (withCars) {
      const cars = runtime.cars;
      for (let i = 0; i < runtime.carCount; i++) {
        const x = cars[i * 2];
        const z = cars[i * 2 + 1];
        if (Math.abs(x - pos.x) > 4 || Math.abs(z - pos.z) > 3) continue;
        const size = CAR_TYPES[carTypeOf(i)];
        carBox[0] = x - size.l / 2;
        carBox[1] = z - size.w / 2;
        carBox[2] = x + size.l / 2;
        carBox[3] = z + size.w / 2;
        pushOut(pos, r, carBox);
      }
    }
  }
  const lim = WORLD_HALF - 1;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}
