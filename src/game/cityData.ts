// 街の配置データを、シード付き乱数で手続き的に生成する。
// 同じシードなら毎回同じ街になる。

import { NPCS } from '../data/npcs';
import { SHARE_STATIONS } from '../data/troubles';
import { zoneAt, type ZoneId } from '../data/zones';

// ---- 乱数 ----
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(2126);
const rand = (min: number, max: number) => min + rng() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

// ---- 型 ----
export type BuildingKind = 'house' | 'shop' | 'stall' | 'warehouse' | 'apartment';

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  kind: BuildingKind;
  zone: ZoneId | null;
  /** 空き家 */
  vacant?: boolean;
  /** シャッターが下りた店 */
  shutter?: boolean;
  /** 店の正面が向く方向（+1: +x 側、-1: -x 側、0: +z 側） */
  front?: number;
  /** 屋根・日よけの色 */
  accent?: string;
  /** 階数 */
  stories?: number;
  /** 屋根の高さ（住宅） */
  roofH?: number;
  /** 屋根の棟が x 方向に通る */
  ridgeX?: boolean;
  /** ベランダがある */
  balcony?: boolean;
  /** 看板の色（商店） */
  sign?: string;
}

export interface Tree {
  x: number;
  z: number;
  scale: number;
  /** 木陰の半径（0 なら判定なし） */
  shade: number;
  /** 円錐形の樹形（イチョウ並木など） */
  cone?: boolean;
}

/** 軸平行の当たり判定 [minX, minZ, maxX, maxZ] */
export type Aabb = [number, number, number, number];

export interface Station {
  id: string;
  x: number;
  z: number;
  name: string;
}

export interface Terminal {
  id: string;
  x: number;
  z: number;
  zone: ZoneId;
}

export interface LitterItem {
  id: number;
  x: number;
  z: number;
  color: string;
  rot: number;
  size: number;
}

export interface Bench {
  x: number;
  z: number;
  rot: number;
}

// ---- 固定の配置 ----

export const PLAYER_START: [number, number] = [0, 12];

export const CLOCK_TOWER = { x: 0, z: 0, size: 5, height: 16 };

/** ポッド乗り場（乗ると配列の次の乗り場へ向かう） */
export const STATIONS: Station[] = [
  { id: 'st-res', x: -23, z: 4, name: '住宅街' },
  { id: 'st-plaza', x: 13, z: 14, name: '中央広場' },
  { id: 'st-shop', x: 22, z: -4, name: '商店街' },
  { id: 'st-ave-e', x: 45, z: 19.6, name: '大通り東' },
  { id: 'st-market', x: -6, z: 37.5, name: '市場' },
  { id: 'st-ave-w', x: -45, z: 19.6, name: '大通り西' },
];

export const TERMINALS: Terminal[] = [
  { id: 'term-res', x: -23, z: -30, zone: 'residential' },
  { id: 'term-shop', x: 39, z: -18, zone: 'shotengai' },
  { id: 'term-plaza', x: -6, z: -13, zone: 'plaza' },
  { id: 'term-market', x: 6, z: 38, zone: 'market' },
  { id: 'term-ave', x: 0, z: 32.6, zone: 'avenue' },
];

export const BENCHES: Bench[] = [
  { x: -43, z: -19, rot: 0 },
  { x: 42, z: -6, rot: -Math.PI / 2 },
  { x: -12, z: -1, rot: Math.PI / 2 },
  { x: -12, z: -10, rot: Math.PI / 2 },
];

/** 大通りの車線（z 座標）と進行方向 */
export const CAR_LANES: { z: number; dir: number }[] = [
  { z: 23, dir: -1 },
  { z: 26, dir: -1 },
  { z: 29, dir: 1 },
];
export const CAR_SPACING = 7.2;
export const CAR_SIZE = { l: 4.2, w: 1.9, h: 1.5 };

export type CarType = 'sedan' | 'kei' | 'van' | 'taxi' | 'truck';

/** 車種ごとの寸法（全長・全幅・全高） */
export const CAR_TYPES: Record<CarType, { l: number; w: number; h: number }> = {
  sedan: { l: 4.4, w: 1.8, h: 1.45 },
  kei: { l: 3.4, w: 1.48, h: 1.75 },
  van: { l: 4.7, w: 1.85, h: 2.0 },
  taxi: { l: 4.5, w: 1.75, h: 1.5 },
  truck: { l: 5.2, w: 1.95, h: 2.3 },
};

const CAR_ORDER: CarType[] = ['sedan', 'kei', 'sedan', 'van', 'taxi', 'kei', 'sedan', 'truck', 'kei', 'sedan', 'van'];

/** 車の通し番号から車種を決める */
export function carTypeOf(index: number): CarType {
  return CAR_ORDER[(index * 7 + 3) % CAR_ORDER.length];
}
export const ROAD = { minZ: 21, maxZ: 31 };

/** 陽射しが強く照り返す場所（広場の東側） */
export const HEAT_PATCHES: [number, number][] = [
  [8, -9],
  [12, 3],
  [5, 7],
  [13, -14],
];

// ---- 予約地点（建物を置かない場所） ----
const reserved: [number, number][] = [
  ...NPCS.map((n) => n.position),
  ...STATIONS.map((s): [number, number] => [s.x, s.z]),
  ...TERMINALS.map((t): [number, number] => [t.x, t.z]),
  ...BENCHES.map((b): [number, number] => [b.x, b.z]),
];

function blocksReserved(x: number, z: number, w: number, d: number) {
  const m = 1.6;
  return reserved.some(
    ([rx, rz]) => rx > x - w / 2 - m && rx < x + w / 2 + m && rz > z - d / 2 - m && rz < z + d / 2 + m,
  );
}

// ---- 建物の生成 ----
const HOUSE_COLORS = ['#e8d8c4', '#d9c3a5', '#efe3d0', '#c9d3d8', '#e3cfc2', '#d4dcc6'];
const HOUSE_ROOFS = ['#4a5362', '#5b4a3f', '#3d4652', '#6d5646', '#556474', '#7a4b3a'];
const SIGNS = ['#d8453a', '#2f6fb0', '#f2b233', '#3d9a5f', '#8a3f8f', '#e46f2e', '#1f8a8a'];
const SHOP_COLORS = ['#e6d2b5', '#dcc7a8', '#efe0c8', '#d8bca0', '#e2d6c6'];
const AWNINGS = ['#c9523f', '#3f7fa8', '#e0a43c', '#4f9a6a', '#b0527c', '#d9773a'];
const STALL_ROOFS = ['#e9e1d0', '#d95d4a', '#3f86b8', '#f0b84a', '#5aa36b'];
const APARTMENT_COLORS = ['#b8bcc6', '#c9c4bb', '#a9b3bf', '#d1ccc3'];

function generateBuildings(): Building[] {
  const list: Building[] = [];

  // 住宅街：3列 × 7行の区画
  const forcedVacant = new Set(['-43,-32']);
  for (const x of [-54, -43, -32]) {
    for (const z of [-54, -43, -32, -21, -10, 1, 12]) {
      const w = rand(5.4, 7);
      const d = rand(5.4, 7);
      const bx = x + rand(-0.6, 0.6);
      const bz = z + rand(-0.6, 0.6);
      if (blocksReserved(bx, bz, w, d)) continue;
      const vacant = forcedVacant.has(`${x},${z}`) || rng() < 0.32;
      const stories = rng() < 0.62 ? 2 : 1;
      list.push({
        x: bx,
        z: bz,
        w,
        d,
        h: stories === 2 ? 5.8 : 3.1,
        stories,
        roofH: rand(1.5, 2.1),
        ridgeX: w > d,
        balcony: stories === 2 && rng() < 0.6,
        color: vacant ? pick(['#a19b90', '#9a958b', '#a8a296']) : pick(HOUSE_COLORS),
        accent: vacant ? '#5a5650' : pick(HOUSE_ROOFS),
        kind: 'house',
        zone: 'residential',
        vacant,
      });
    }
  }

  // 商店街：通り（x=34〜44）の両側に店が並ぶ
  const shopZs: number[] = [];
  for (let z = -56; z <= 11; z += 7.4) shopZs.push(z);
  for (const [x, front] of [
    [30, 1],
    [48, -1],
  ] as const) {
    shopZs.forEach((z, i) => {
      // 路地を1本あける
      if (x === 30 && i === 4) return;
      const w = 7;
      const d = 6.5;
      if (blocksReserved(x, z, w, d)) return;
      const shutter = rng() < 0.45;
      list.push({
        x,
        z,
        w,
        d,
        h: pick([6.2, 6.4, 8.6, 9]),
        stories: 2,
        color: pick(SHOP_COLORS),
        accent: shutter ? '#8d9096' : pick(AWNINGS),
        sign: pick(SIGNS),
        kind: 'shop',
        zone: 'shotengai',
        shutter,
        front,
      });
    });
  }
  // 裏手の低い建物
  shopZs.forEach((z, i) => {
    if (i % 2 === 1) return;
    list.push({ x: 57, z, w: 6, d: 7, h: 6.6, stories: 2, color: pick(APARTMENT_COLORS), kind: 'apartment', zone: 'shotengai' });
  });

  // 北側の通り：集合住宅とオフィス
  for (const x of [-11, 0, 11]) {
    for (const z of [-54, -41, -28]) {
      const stories = 3 + Math.floor(rng() * 4);
      list.push({
        x,
        z,
        w: 8,
        d: 8.5,
        h: stories * 3 + 0.8,
        stories,
        color: pick(APARTMENT_COLORS),
        kind: 'apartment',
        zone: null,
      });
    }
  }

  // 市場：屋台が2列に並ぶ
  for (const x of [-50, -38, -26, -14, 14, 26, 38, 50]) {
    for (const z of [42, 52]) {
      if (blocksReserved(x, z, 7, 3)) continue;
      list.push({
        x,
        z,
        w: 7,
        d: 3,
        h: 1.1,
        color: '#8a6a4e',
        accent: pick(STALL_ROOFS),
        kind: 'stall',
        zone: 'market',
      });
    }
  }
  for (const x of [-40, -20, 20, 40]) {
    list.push({ x, z: 59, w: 9, d: 4, h: rand(3.5, 5), color: '#b59f8a', kind: 'warehouse', zone: 'market' });
  }
  list.push({ x: -57, z: 50, w: 8, d: 14, h: 6.5, color: '#a89480', kind: 'warehouse', zone: 'market' });
  list.push({ x: 57, z: 50, w: 8, d: 14, h: 6.5, color: '#a89480', kind: 'warehouse', zone: 'market' });

  return list;
}

export const BUILDINGS: Building[] = generateBuildings();

// ---- 木 ----
function generateTrees(): Tree[] {
  const trees: Tree[] = [];
  // 広場の西側：木陰の林
  const plaza: [number, number][] = [
    [-14, -14],
    [-15, -5],
    [-14.5, 4],
    [-13, 13],
    [-6, 15.5],
    [-8, -16],
    [-9, 9],
  ];
  for (const [x, z] of plaza) trees.push({ x, z, scale: rand(1.25, 1.5), shade: 4.2 });
  // 広場の東側は日なた。端に1本だけ
  trees.push({ x: 15.5, z: -15.5, scale: 1.1, shade: 3.4 });

  // 街路樹（広場の東西の通り）
  for (let z = -56; z <= 14; z += 10) {
    trees.push({ x: -20.5, z, scale: rand(0.9, 1.1), shade: 3 });
    trees.push({ x: 20.2, z: z + 5, scale: rand(0.9, 1.1), shade: 3 });
  }
  // 大通りの歩道
  for (let x = -58; x <= 58; x += 14) {
    if (Math.abs(x) < 4) continue;
    trees.push({ x, z: 33.4, scale: 0.85, shade: 2.6, cone: true });
  }
  // 住宅街の庭木
  for (let i = 0; i < 10; i++) {
    const x = rand(-58, -20);
    const z = rand(-58, 16);
    if (collidesStatic(x, z, 1.2, baseColliders)) continue;
    trees.push({ x, z, scale: rand(0.7, 1), shade: 2.4 });
  }
  return trees;
}

/** 空き家に茂る草むら */
export const BUSHES: [number, number, number][] = BUILDINGS.filter((b) => b.vacant).flatMap((b) => [
  [b.x - b.w / 2 - 0.4, b.z + rand(-2, 2), rand(0.7, 1.1)] as [number, number, number],
  [b.x + rand(-2, 2), b.z + b.d / 2 + 0.4, rand(0.6, 1)] as [number, number, number],
]);

// ---- 街の小物 ----

export interface Prop {
  x: number;
  z: number;
  /** 正面の向き（y 軸回転） */
  rot: number;
}

/** 街灯 */
export const STREET_LIGHTS: Prop[] = [
  ...[-51, -41, -31, -21, -11, -1, 9].map((z) => ({ x: -18.8, z, rot: Math.PI / 2 })),
  ...[-54, -44, -34, -24, -14, 6].map((z) => ({ x: 18.8, z, rot: -Math.PI / 2 })),
  ...[-52, -38, -24, -10, 10, 24, 38, 52].map((x) => ({ x, z: 18.4, rot: 0 })),
  ...[-52, -38, -24, -10, 10, 24, 38, 52].map((x) => ({ x, z: 33.6, rot: Math.PI })),
  ...[-46, -34, -22, -10, 2].map((z) => ({ x: 34.3, z, rot: Math.PI / 2 })),
  ...[-52, -40, -28, -16, 8].map((z) => ({ x: 43.7, z, rot: -Math.PI / 2 })),
  { x: 16.5, z: 16.5, rot: Math.PI },
  { x: -16.5, z: 16.5, rot: Math.PI },
  { x: -16.5, z: -16.5, rot: 0 },
  { x: 9.5, z: 39, rot: 0 },
  { x: -9.5, z: 39, rot: 0 },
];

/** 電柱（住宅街の東の通り）。順番に電線でつながる */
export const UTILITY_POLES: Prop[] = [-56, -45, -34, -23, -12, -1, 10].map((z) => ({ x: -27.2, z, rot: 0 }));

/** 自動販売機（rot は正面の向き） */
export const VENDING_MACHINES: Prop[] = [
  { x: -25.3, z: -17, rot: Math.PI / 2 },
  { x: 21.8, z: -9.5, rot: -Math.PI / 2 },
  { x: 44.1, z: -36, rot: -Math.PI / 2 },
  { x: -17, z: 8.5, rot: Math.PI / 2 },
  { x: -11.5, z: 35.9, rot: Math.PI },
];

/** 郵便ポスト */
export const MAILBOXES: Prop[] = [
  { x: -25.4, z: -3, rot: Math.PI / 2 },
  { x: 44.2, z: -24, rot: -Math.PI / 2 },
];

/** 横断歩道の信号機 */
export const SIGNALS: Prop[] = [-30, 0, 30].flatMap((cx) => [
  { x: cx + 2.7, z: 19.3, rot: Math.PI },
  { x: cx - 2.7, z: 32.7, rot: 0 },
]);

/** 歩道と車道を分けるガードレール [x0, x1, z] */
export const GUARD_RAILS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const gapsNorth = [-45, -30, 0, 30, 45];
  const gapsSouth = [-30, 0, 30];
  const build = (gaps: number[], z: number) => {
    let start = -62;
    for (const g of gaps) {
      out.push([start, g - 2.4, z]);
      start = g + 2.4;
    }
    out.push([start, 62, z]);
  };
  build(gapsNorth, 20.85);
  build(gapsSouth, 31.15);
  return out;
})();

/** 住宅の前のブロック塀（門の部分はあけておく） [x, z, 長さ, 回転] */
export const HOUSE_WALLS: [number, number, number, number][] = BUILDINGS.filter((b) => b.kind === 'house').flatMap(
  (b) => {
    const z = b.z + b.d / 2 + 0.8;
    const seg = (b.w - 1.6) / 2;
    return [
      [b.x - b.w / 2 + seg / 2, z, seg, 0],
      [b.x + b.w / 2 - seg / 2, z, seg, 0],
    ] as [number, number, number, number][];
  },
);

const poleBox = (p: Prop, r = 0.2): Aabb => [p.x - r, p.z - r, p.x + r, p.z + r];

// ---- 当たり判定 ----
const baseColliders: Aabb[] = [
  ...BUILDINGS.map((b): Aabb => [b.x - b.w / 2, b.z - b.d / 2, b.x + b.w / 2, b.z + b.d / 2]),
  ...STREET_LIGHTS.map((p) => poleBox(p)),
  ...UTILITY_POLES.map((p) => poleBox(p, 0.25)),
  ...SIGNALS.map((p) => poleBox(p)),
  ...MAILBOXES.map((p) => poleBox(p, 0.3)),
  ...VENDING_MACHINES.map((p) => poleBox(p, 0.55)),
  ...GUARD_RAILS.map(([x0, x1, z]): Aabb => [x0, z - 0.12, x1, z + 0.12]),
  ...HOUSE_WALLS.map(([x, z, len]): Aabb => [x - len / 2, z - 0.12, x + len / 2, z + 0.12]),
  // シェアカート置き場（横長の向きに合わせる）
  ...SHARE_STATIONS.map((s): Aabb => {
    const across = Math.abs(Math.sin(s.rot)) > 0.5;
    const hx = across ? 0.7 : 1.4;
    const hz = across ? 1.4 : 0.7;
    return [s.x - hx, s.z - hz, s.x + hx, s.z + hz];
  }),
  [
    CLOCK_TOWER.x - CLOCK_TOWER.size / 2 - 0.6,
    CLOCK_TOWER.z - CLOCK_TOWER.size / 2 - 0.6,
    CLOCK_TOWER.x + CLOCK_TOWER.size / 2 + 0.6,
    CLOCK_TOWER.z + CLOCK_TOWER.size / 2 + 0.6,
  ],
  ...TERMINALS.map((t): Aabb => [t.x - 0.45, t.z - 0.35, t.x + 0.45, t.z + 0.35]),
];

export function collidesStatic(x: number, z: number, r: number, boxes: Aabb[] = COLLIDERS): boolean {
  for (const [x0, z0, x1, z1] of boxes) {
    if (x + r > x0 && x - r < x1 && z + r > z0 && z - r < z1) return true;
  }
  return false;
}

export const TREES: Tree[] = generateTrees();

export const COLLIDERS: Aabb[] = [
  ...baseColliders,
  ...TREES.map((t): Aabb => [t.x - 0.35 * t.scale, t.z - 0.35 * t.scale, t.x + 0.35 * t.scale, t.z + 0.35 * t.scale]),
];

// ---- ごみ ----
const LITTER_COLORS = ['#f4f1e6', '#d9534f', '#5b8fd1', '#e8c547', '#7fb069', '#c8b8a6', '#b9b9b9'];

function generateLitter(): LitterItem[] {
  const areas: { rect: [number, number, number, number]; count: number }[] = [
    { rect: [-58, 44.5, 58, 49.5], count: 9 }, // 市場の通路
    { rect: [-58, 35, 58, 39.5], count: 4 }, // 市場の入口
    { rect: [-58, 54.5, 58, 56.5], count: 3 },
    { rect: [-60, 18.2, 60, 20.6], count: 3 }, // 大通りの歩道
    { rect: [-60, 31.4, 60, 33.8], count: 2 },
    { rect: [2, -16, 16, 16], count: 3 }, // 広場の日なた
    { rect: [34.5, -58, 43.5, 14], count: 3 }, // 商店街
    { rect: [-59, -58, -20, 16], count: 3 }, // 住宅街
  ];
  const items: LitterItem[] = [];
  let id = 0;
  for (const area of areas) {
    let placed = 0;
    let tries = 0;
    while (placed < area.count && tries < 200) {
      tries++;
      const x = rand(area.rect[0], area.rect[2]);
      const z = rand(area.rect[1], area.rect[3]);
      if (collidesStatic(x, z, 0.8)) continue;
      if (items.some((l) => Math.hypot(l.x - x, l.z - z) < 4)) continue;
      items.push({ id: id++, x, z, color: pick(LITTER_COLORS), rot: rand(0, Math.PI * 2), size: rand(0.28, 0.42) });
      placed++;
    }
  }
  return items;
}

export const LITTER: LitterItem[] = generateLitter();

/** 区域ごとの参照用（ミニマップなど） */
export function buildingZone(b: Building): ZoneId | null {
  return b.zone ?? zoneAt(b.x, b.z);
}
