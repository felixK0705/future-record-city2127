// 建物・木・街の小物を、部品ごとのインスタンス配列に分解する。
// 形の種類ごとに InstancedMesh を1つだけ使うので、部品が増えても描画は軽い。

import {
  BENCHES,
  BUILDINGS,
  GUARD_RAILS,
  HOUSE_WALLS,
  MAILBOXES,
  SIGNALS,
  STREET_LIGHTS,
  TREES,
  UTILITY_POLES,
  VENDING_MACHINES,
  type Building,
} from '../game/cityData';
import type { InstanceSpec } from './Instanced';

export interface PartGroups {
  /** 壁・屋根など、未来で強く染まる部分 */
  structure: InstanceSpec[];
  /** 窓・扉・看板などの細部 */
  detail: InstanceSpec[];
  /** 切妻屋根の妻壁（三角柱） */
  gables: InstanceSpec[];
  /** 自ら光る部品（照明・自販機の表示など） */
  glow: InstanceSpec[];
  /** 円柱（柱・給水タンクなど） */
  cylinders: InstanceSpec[];
}

type Placer = (
  lx: number,
  ly: number,
  lz: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
  rz?: number,
) => InstanceSpec;

/** 建物のローカル座標（y 軸回転 yaw）から世界座標の部品を作る */
function placer(bx: number, bz: number, yaw: number): Placer {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return (lx, ly, lz, sx, sy, sz, color, rz = 0) => ({
    x: bx + lx * c + lz * s,
    y: ly,
    z: bz - lx * s + lz * c,
    sx,
    sy,
    sz,
    color,
    ry: yaw,
    rz,
  });
}

const GLASS = '#7f9bb6';
const GLASS_DARK = '#5a7189';
const FRAME = '#f1ede4';
const TRIM = '#e7e1d6';
const WOOD = '#6b4a33';
const BOARD = '#7a6148';

/** 色を少し暗くする */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((1 << 24) | (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b)).toString(16).slice(1)}`;
}

// ---- 住宅 ----
function addHouse(b: Building, g: PartGroups) {
  const P = placer(b.x, b.z, 0);
  const { w, d, h } = b;
  const stories = b.stories ?? 1;
  const roofH = b.roofH ?? 1.8;
  const vacant = !!b.vacant;
  const front = d / 2;

  // 基礎・壁・胴差し
  g.detail.push(P(0, 0.2, 0, w + 0.14, 0.4, d + 0.14, '#8d8880'));
  g.structure.push(P(0, h / 2 + 0.2, 0, w, h - 0.4 + 0.4, d, b.color));
  if (stories === 2) g.detail.push(P(0, 3.0, 0, w + 0.08, 0.16, d + 0.08, vacant ? '#8f897f' : TRIM));

  // 切妻屋根：妻壁＋両側の屋根板＋棟
  const yaw = b.ridgeX ? Math.PI / 2 : 0;
  const R = placer(b.x, b.z, yaw);
  const span = b.ridgeX ? d : w;
  const length = b.ridgeX ? w : d;
  const top = h + 0.2;
  g.gables.push(R(0, top, 0, span, roofH, length, b.color));
  const o = 0.5;
  const half = span / 2;
  const a = Math.atan2(roofH, half);
  const k = (half + o) / half;
  const L = Math.hypot(half, roofH) * k;
  const cy = top + roofH - (roofH * k) / 2 + 0.1;
  const roof = b.accent ?? '#4a5362';
  g.structure.push(R((half + o) / 2, cy, 0, L, 0.18, length + o * 2, roof, -a));
  g.structure.push(R(-(half + o) / 2, cy, 0, L, 0.18, length + o * 2, roof, a));
  g.detail.push(R(0, top + roofH + 0.16, 0, 0.34, 0.22, length + o * 2, shade(roof, 0.75)));

  // 窓
  const win = (x: number, y: number, face: 'front' | 'back' | 'left' | 'right') => {
    const fw = 1.25;
    const fh = 1.05;
    let px = x;
    let pz = 0;
    let sx = fw;
    let sz = 0.06;
    if (face === 'front') pz = front + 0.03;
    if (face === 'back') pz = -front - 0.03;
    if (face === 'left' || face === 'right') {
      px = face === 'right' ? w / 2 + 0.03 : -w / 2 - 0.03;
      pz = x;
      sx = 0.06;
      sz = fw;
    }
    g.detail.push(P(px, y, pz, sx, fh, sz, vacant ? '#6d665b' : FRAME));
    const inset = face === 'front' ? 0.02 : face === 'back' ? -0.02 : 0;
    const insetX = face === 'right' ? 0.02 : face === 'left' ? -0.02 : 0;
    g.detail.push(
      P(px + insetX, y, pz + inset, sx === 0.06 ? 0.07 : fw - 0.2, fh - 0.2, sz === 0.06 ? 0.07 : fw - 0.2, vacant ? BOARD : GLASS),
    );
    if (vacant && face === 'front') {
      // 打ち付けられた板
      g.detail.push(P(px, y, pz + 0.08, 1.35, 0.13, 0.06, '#8a6d4c', 0.55));
      g.detail.push(P(px, y, pz + 0.1, 1.35, 0.13, 0.06, '#94764f', -0.55));
    }
  };
  const doorX = -w * 0.24;
  win(w * 0.24, 1.6, 'front');
  win(0, 1.6, 'back');
  win(0, 1.6, 'right');
  win(-d * 0.15, 1.6, 'left');
  if (stories === 2) {
    win(-w * 0.24, 4.35, 'front');
    win(w * 0.24, 4.35, 'front');
    win(0, 4.35, 'back');
    win(0, 4.35, 'left');
  }

  // 玄関と庇
  g.detail.push(P(doorX, 1.05, front + 0.05, 0.95, 1.9, 0.1, vacant ? '#4f4336' : WOOD));
  g.detail.push(P(doorX + 0.32, 1.05, front + 0.12, 0.06, 0.06, 0.06, '#d8c28a'));
  g.detail.push(P(doorX, 2.3, front + 0.38, 1.45, 0.1, 0.76, shade(roof, 0.9)));

  // ベランダ
  if (b.balcony) {
    const bw = w * 0.56;
    const bx = w * 0.18;
    g.detail.push(P(bx, 3.05, front + 0.55, bw, 0.14, 1.1, TRIM));
    g.detail.push(P(bx, 3.55, front + 1.08, bw, 0.9, 0.06, vacant ? '#8d877d' : '#dcd8d0'));
    g.detail.push(P(bx - bw / 2, 3.55, front + 0.58, 0.06, 0.9, 1.0, '#dcd8d0'));
    g.detail.push(P(bx + bw / 2, 3.55, front + 0.58, 0.06, 0.9, 1.0, '#dcd8d0'));
    if (!vacant) {
      // 物干しの洗濯物
      g.detail.push(P(bx - 0.4, 3.9, front + 0.7, 0.5, 0.55, 0.04, '#f4f1e8'));
      g.detail.push(P(bx + 0.3, 3.95, front + 0.7, 0.45, 0.45, 0.04, '#9cc1dd'));
    }
  }

  // エアコンの室外機
  if (!vacant) {
    g.detail.push(P(w / 2 + 0.22, 0.45, -d * 0.2, 0.36, 0.55, 0.75, '#ecebe6'));
    g.detail.push(P(w / 2 + 0.41, 0.45, -d * 0.2, 0.02, 0.36, 0.36, '#5a5f66'));
  }
}

// ---- 商店 ----
function addShop(b: Building, g: PartGroups) {
  const yaw = (b.front ?? 1) === 1 ? 0 : Math.PI;
  const P = placer(b.x, b.z, yaw);
  const { w, d, h } = b;
  const fx = w / 2;
  const sign = b.sign ?? '#d8453a';

  g.structure.push(P(0, h / 2, 0, w, h, d, b.color));
  g.detail.push(P(0, h + 0.12, 0, w + 0.16, 0.24, d + 0.16, shade(b.color, 0.72)));
  // 1階の店構え
  g.detail.push(P(fx + 0.02, 1.4, 0, 0.12, 2.8, d * 0.94, '#3f3f45'));
  if (b.shutter) {
    g.detail.push(P(fx + 0.07, 1.3, 0, 0.1, 2.5, d * 0.84, '#a3a8ae'));
    for (let i = 0; i < 9; i++) g.detail.push(P(fx + 0.13, 0.2 + i * 0.28, 0, 0.04, 0.05, d * 0.84, '#80868d'));
    g.detail.push(P(fx + 0.13, 2.62, 0, 0.18, 0.2, d * 0.88, '#6f747a'));
  } else {
    g.detail.push(P(fx + 0.07, 1.25, 0, 0.08, 2.3, d * 0.8, GLASS));
    for (const z of [-d * 0.2, d * 0.2]) g.detail.push(P(fx + 0.12, 1.25, z, 0.08, 2.3, 0.1, '#3a3a40'));
    // 日よけ
    g.detail.push(P(fx + 0.78, 2.95, 0, 1.6, 0.08, d * 0.92, b.accent ?? '#c9523f', -0.34));
    for (let i = 0; i < 4; i++) {
      g.detail.push(P(fx + 0.8, 2.97, -d * 0.36 + i * d * 0.24, 1.6, 0.085, d * 0.08, '#f5efe2', -0.34));
    }
    g.detail.push(P(fx + 1.54, 2.55, 0, 0.05, 0.34, d * 0.92, b.accent ?? '#c9523f'));
    // 店先の商品台と鉢植え
    g.detail.push(P(fx + 0.55, 0.45, d * 0.28, 0.8, 0.9, 1.3, '#8a6a4e'));
    g.detail.push(P(fx + 0.55, 0.95, d * 0.28, 0.7, 0.18, 1.2, ['#e05a3c', '#f2b440', '#6fae4c'][Math.abs(Math.round(b.z)) % 3]));
  }
  // 横長の看板
  g.detail.push(P(fx + 0.12, 3.75, 0, 0.2, 0.95, d * 0.9, sign));
  g.detail.push(P(fx + 0.23, 3.75, 0, 0.04, 0.55, d * 0.6, '#fbf6ea'));
  // 袖看板
  const sy = Math.min(h - 1.4, 5.6);
  g.detail.push(P(fx + 0.5, sy, d / 2 - 0.6, 0.75, 1.9, 0.16, sign));
  g.detail.push(P(fx + 0.5, sy, d / 2 - 0.6, 0.45, 1.45, 0.18, '#fffaf0'));
  g.detail.push(P(fx + 0.1, sy + 0.7, d / 2 - 0.6, 0.3, 0.06, 0.06, '#555'));
  // 2階の窓
  for (const lz of [-d * 0.25, d * 0.25]) {
    g.detail.push(P(fx + 0.03, 5.1, lz, 0.06, 1.2, 1.5, FRAME));
    g.detail.push(P(fx + 0.05, 5.1, lz, 0.07, 1.0, 1.3, GLASS_DARK));
    if (h > 8) {
      g.detail.push(P(fx + 0.03, 7.4, lz, 0.06, 1.1, 1.5, FRAME));
      g.detail.push(P(fx + 0.05, 7.4, lz, 0.07, 0.9, 1.3, GLASS_DARK));
    }
  }
}

// ---- 集合住宅・オフィス ----
function addApartment(b: Building, g: PartGroups) {
  const P = placer(b.x, b.z, 0);
  const { w, d, h } = b;
  const stories = b.stories ?? 3;
  g.structure.push(P(0, h / 2, 0, w, h, d, b.color));
  g.detail.push(P(0, h + 0.3, 0, w + 0.2, 0.6, d + 0.2, shade(b.color, 0.82)));
  // 屋上の給水タンクと室外機
  g.cylinders.push(P(w * 0.25, h + 1.5, -d * 0.2, 1.5, 1.6, 1.5, '#cfd3d8'));
  g.detail.push(P(-w * 0.25, h + 0.95, d * 0.2, 1.2, 0.7, 0.8, '#e6e6e2'));
  // 1階の入口
  g.detail.push(P(0, 1.2, d / 2 + 0.04, 1.8, 2.3, 0.08, GLASS));
  g.detail.push(P(0, 2.55, d / 2 + 0.6, 2.6, 0.14, 1.2, '#8e939a'));
  for (let i = 1; i < stories; i++) {
    const y = 0.8 + i * 3;
    // 南側：ベランダ
    g.detail.push(P(0, y + 1.1, d / 2 + 0.03, w * 0.84, 2.0, 0.06, GLASS_DARK));
    g.detail.push(P(0, y, d / 2 + 0.6, w * 0.96, 0.18, 1.2, '#d9dce0'));
    g.detail.push(P(0, y + 0.55, d / 2 + 1.18, w * 0.96, 0.9, 0.08, '#eef0f2'));
    g.detail.push(P(0, y + 0.55, d / 2 + 0.6, 0.08, 0.9, 1.1, '#c7cbd0'));
    // 北側：窓の帯
    g.detail.push(P(0, y + 1.3, -d / 2 - 0.03, w * 0.84, 0.95, 0.06, GLASS_DARK));
    // 東西：小窓
    for (const sx of [-1, 1]) {
      g.detail.push(P(sx * (w / 2 + 0.03), y + 1.3, -d * 0.2, 0.06, 1.0, 1.0, GLASS_DARK));
      g.detail.push(P(sx * (w / 2 + 0.03), y + 1.3, d * 0.2, 0.06, 1.0, 1.0, GLASS_DARK));
    }
  }
}

// ---- 市場の屋台 ----
function addStall(b: Building, g: PartGroups, index: number) {
  const P = placer(b.x, b.z, 0);
  const { w, d } = b;
  g.structure.push(P(0, 0.55, 0, w, 1.1, d, '#8a6a4e'));
  g.detail.push(P(0, 1.12, 0, w + 0.1, 0.06, d + 0.1, '#a88663'));
  // 縞模様の天幕
  const cw = w + 0.8;
  const n = 6;
  for (let i = 0; i < n; i++) {
    g.structure.push({
      ...P(-cw / 2 + (cw / n) * (i + 0.5), 2.85, 0, cw / n + 0.01, 0.1, d + 1.8, i % 2 ? '#f4efe4' : (b.accent ?? '#d95d4a')),
      rx: 0.1,
    });
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.cylinders.push(P(sx * (w / 2 + 0.2), 1.4, sz * (d / 2 + 0.7), 0.1, 2.8, 0.1, '#6b5a4a'));
    }
  }
  // 並んだ野菜と果物の箱
  const colors = ['#e05a3c', '#f2b440', '#6fae4c', '#c8743a', '#d8d24a', '#9b3d5a'];
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + 0.75 + i * ((w - 1.5) / 4);
    g.detail.push(P(x, 1.25, 0, 1.1, 0.22, 1.8, '#b08a5f'));
    g.detail.push(P(x, 1.42, 0, 0.95, 0.18, 1.6, colors[(index + i) % colors.length]));
  }
  // 足元の木箱
  g.detail.push(P(w / 2 + 0.6, 0.3, -d / 2 + 0.3, 0.8, 0.6, 0.6, '#a07d55'));
  g.detail.push(P(w / 2 + 0.6, 0.85, -d / 2 + 0.3, 0.7, 0.5, 0.55, '#b08a5f'));
  // 裸電球
  g.glow.push(P(-w * 0.25, 2.45, 0, 0.18, 0.22, 0.18, '#ffe2a0'));
  g.glow.push(P(w * 0.25, 2.45, 0, 0.18, 0.22, 0.18, '#ffe2a0'));
}

// ---- 倉庫 ----
function addWarehouse(b: Building, g: PartGroups) {
  const P = placer(b.x, b.z, 0);
  const { w, d, h } = b;
  g.structure.push(P(0, h / 2, 0, w, h, d, b.color));
  g.detail.push(P(0, h + 0.1, 0, w + 0.2, 0.2, d + 0.2, '#7d6e60'));
  // 縦のリブ
  const ribs = Math.floor(w / 0.9);
  for (let i = 0; i < ribs; i++) {
    g.detail.push(P(-w / 2 + 0.45 + i * 0.9, h / 2, -d / 2 - 0.04, 0.08, h, 0.08, shade(b.color, 0.85)));
  }
  // シャッター（市場側）
  const face = b.x < -50 ? 1 : b.x > 50 ? -1 : 0;
  if (face === 0) {
    g.detail.push(P(0, 1.5, -d / 2 - 0.08, w * 0.5, 3, 0.08, '#9aa0a6'));
  } else {
    g.detail.push(P(face * (w / 2 + 0.05), 1.7, 0, 0.08, 3.4, d * 0.4, '#9aa0a6'));
  }
}

function buildCityParts(): PartGroups {
  const g: PartGroups = { structure: [], detail: [], gables: [], glow: [], cylinders: [] };
  BUILDINGS.forEach((b, i) => {
    if (b.kind === 'house') addHouse(b, g);
    else if (b.kind === 'shop') addShop(b, g);
    else if (b.kind === 'apartment') addApartment(b, g);
    else if (b.kind === 'stall') addStall(b, g, i);
    else addWarehouse(b, g);
  });
  return g;
}

export const CITY_PARTS: PartGroups = buildCityParts();

// ---- 木 ----
export interface TreeParts {
  trunks: InstanceSpec[];
  crowns: InstanceSpec[];
  cones: InstanceSpec[];
}

function buildTrees(): TreeParts {
  const t: TreeParts = { trunks: [], crowns: [], cones: [] };
  const greens = ['#4f8a4a', '#5c9750', '#467f45', '#6aa35a'];
  TREES.forEach((tree, i) => {
    const s = tree.scale;
    t.trunks.push({ x: tree.x, y: 1.3 * s, z: tree.z, sx: 0.36 * s, sy: 2.6 * s, sz: 0.36 * s, color: '#6b4f3a' });
    if (tree.cone) {
      t.cones.push({ x: tree.x, y: 3.9 * s, z: tree.z, sx: 2.6 * s, sy: 4.2 * s, sz: 2.6 * s, color: '#6f9c3e' });
      return;
    }
    const base = greens[i % greens.length];
    const offs: [number, number, number, number][] = [
      [0, 3.5, 0, 2.6],
      [0.75, 3.1, 0.4, 1.9],
      [-0.6, 3.25, -0.55, 2.0],
      [0.1, 4.3, -0.2, 1.8],
    ];
    offs.forEach(([ox, oy, oz, r], j) => {
      t.crowns.push({
        x: tree.x + ox * s,
        y: oy * s,
        z: tree.z + oz * s,
        sx: r * s * 1.15,
        sy: r * s,
        sz: r * s * 1.15,
        color: j === 3 ? shade(base, 1.12) : base,
        ry: i + j,
      });
    });
  });
  return t;
}

export const TREE_PARTS: TreeParts = buildTrees();

// ---- 街の小物 ----
function buildProps(): PartGroups {
  const g: PartGroups = { structure: [], detail: [], gables: [], glow: [], cylinders: [] };

  // 街灯
  for (const p of STREET_LIGHTS) {
    const P = placer(p.x, p.z, p.rot);
    g.cylinders.push(P(0, 2.4, 0, 0.14, 4.8, 0.14, '#5b6068'));
    g.detail.push(P(0, 4.75, 0.55, 0.12, 0.1, 1.1, '#5b6068'));
    g.detail.push(P(0, 4.66, 1.05, 0.42, 0.14, 0.62, '#474b52'));
    g.glow.push(P(0, 4.57, 1.05, 0.34, 0.05, 0.52, '#fff4d2'));
  }

  // 電柱
  for (const p of UTILITY_POLES) {
    g.cylinders.push({ x: p.x, y: 4, z: p.z, sx: 0.3, sy: 8, sz: 0.3, color: '#a9a49a' });
    g.detail.push({ x: p.x, y: 7.2, z: p.z, sx: 1.6, sy: 0.12, sz: 0.12, color: '#6d6a64' });
    g.cylinders.push({ x: p.x + 0.35, y: 6.1, z: p.z, sx: 0.5, sy: 0.7, sz: 0.5, color: '#8f969c' });
  }

  // 自動販売機
  for (const p of VENDING_MACHINES) {
    const P = placer(p.x, p.z, p.rot);
    g.detail.push(P(0, 0.9, 0, 1.0, 1.8, 0.75, '#e9ecef'));
    g.detail.push(P(0, 1.85, 0, 1.04, 0.1, 0.8, '#d6453a'));
    g.glow.push(P(0, 1.3, 0.38, 0.82, 0.7, 0.02, '#e8f6ff'));
    for (let i = 0; i < 4; i++) {
      g.glow.push(P(-0.3 + i * 0.2, 1.3, 0.4, 0.12, 0.28, 0.02, ['#e05a3c', '#3f86b8', '#f2b440', '#5aa36b'][i]));
    }
    g.detail.push(P(0, 0.45, 0.38, 0.6, 0.18, 0.04, '#2d3036'));
  }

  // 郵便ポスト
  for (const p of MAILBOXES) {
    g.cylinders.push({ x: p.x, y: 0.7, z: p.z, sx: 0.55, sy: 1.1, sz: 0.55, color: '#d23b2f' });
    g.cylinders.push({ x: p.x, y: 1.3, z: p.z, sx: 0.62, sy: 0.12, sz: 0.62, color: '#b8322a' });
  }

  // 信号機
  for (const p of SIGNALS) {
    const P = placer(p.x, p.z, p.rot);
    g.cylinders.push(P(0, 1.8, 0, 0.14, 3.6, 0.14, '#6b7078'));
    g.detail.push(P(0, 3.2, 0.12, 0.36, 0.8, 0.22, '#3a3d44'));
    g.glow.push(P(0, 3.42, 0.24, 0.2, 0.2, 0.02, '#ff5a4a'));
    g.detail.push(P(0, 2.98, 0.24, 0.2, 0.2, 0.02, '#2f5a3a'));
  }

  // ガードレール
  for (const [x0, x1, z] of GUARD_RAILS) {
    const len = x1 - x0;
    if (len <= 0) continue;
    const cx = (x0 + x1) / 2;
    g.detail.push({ x: cx, y: 0.72, z, sx: len, sy: 0.28, sz: 0.06, color: '#f2f3f4' });
    for (let x = x0 + 0.5; x < x1; x += 2.2) {
      g.detail.push({ x, y: 0.36, z, sx: 0.1, sy: 0.72, sz: 0.1, color: '#c9ccd0' });
    }
  }

  // 住宅のブロック塀
  for (const [x, z, len] of HOUSE_WALLS) {
    if (len <= 0.2) continue;
    g.detail.push({ x, y: 0.52, z, sx: len, sy: 1.04, sz: 0.2, color: '#bdb6aa' });
    g.detail.push({ x, y: 1.08, z, sx: len + 0.04, sy: 0.08, sz: 0.26, color: '#a0998d' });
  }

  // ベンチ
  for (const b of BENCHES) {
    const P = placer(b.x, b.z, b.rot);
    g.detail.push(P(0, 0.45, 0, 2, 0.1, 0.55, '#9a6f4c'));
    g.detail.push(P(0, 0.82, -0.26, 2, 0.4, 0.07, '#9a6f4c'));
    for (const sx of [-0.85, 0.85]) g.detail.push(P(sx, 0.22, 0, 0.08, 0.44, 0.5, '#4d5158'));
  }

  // 診療所の看板（商店街の奥）
  g.detail.push({ x: 44.46, y: 5.3, z: -55, sx: 0.06, sy: 1.5, sz: 1.5, color: '#ffffff' });
  g.glow.push({ x: 44.4, y: 5.3, z: -55, sx: 0.04, sy: 0.34, sz: 1.1, color: '#35b86a' });
  g.glow.push({ x: 44.4, y: 5.3, z: -55, sx: 0.04, sy: 1.1, sz: 0.34, color: '#35b86a' });

  // バス停
  g.cylinders.push({ x: 43.6, y: 1.3, z: -8, sx: 0.12, sy: 2.6, sz: 0.12, color: '#9aa0a8' });
  g.cylinders.push({ x: 43.6, y: 2.7, z: -8, sx: 0.9, sy: 0.08, sz: 0.9, color: '#e25c4b' });
  g.detail.push({ x: 43.2, y: 1.2, z: -6, sx: 0.08, sy: 2.4, sz: 2.6, color: '#b9c6d1' });
  g.detail.push({ x: 42.6, y: 2.45, z: -6, sx: 1.6, sy: 0.08, sz: 2.8, color: '#7c8791' });

  return g;
}

export const PROP_PARTS: PartGroups = buildProps();

/** 電線（隣り合う電柱を結ぶ）の頂点列 */
export const WIRE_POINTS: number[] = (() => {
  const pts: number[] = [];
  for (let i = 0; i < UTILITY_POLES.length - 1; i++) {
    const a = UTILITY_POLES[i];
    const b = UTILITY_POLES[i + 1];
    for (const [ox, y] of [
      [-0.7, 7.25],
      [0.7, 7.25],
      [0, 6.6],
    ] as const) {
      // たるみを付けるため中点を少し下げる
      const mx = (a.x + b.x) / 2 + ox;
      const mz = (a.z + b.z) / 2;
      pts.push(a.x + ox, y, a.z, mx, y - 0.45, mz);
      pts.push(mx, y - 0.45, mz, b.x + ox, y, b.z);
    }
  }
  return pts;
})();
