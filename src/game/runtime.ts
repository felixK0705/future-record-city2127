// 毎フレーム書き換わる値を置く、再レンダリングを起こさないランタイム状態。
// 行動ログの連続値（距離・滞在時間など）はここに貯め、1秒ごとに zustand へ同期する。

import type { ZoneId } from '../data/zones';
import { CAR_LANES, CAR_SPACING, LITTER, PLAYER_START } from './cityData';
import { NPCS } from '../data/npcs';
import { TROUBLES, type Point } from '../data/troubles';
import type { HelpMethod } from '../data/behaviors';

/** NPC を台本どおりに動かす指示（なければ普段どおり歩き回る） */
export type NpcScript =
  | { mode: 'follow' }
  | { mode: 'followNpc'; id: string }
  | { mode: 'path'; points: Point[]; idx: number; speed: number };

/** 困りごとの荷物がいまどこにあるか */
export type LuggageAt = 'ground' | 'player' | 'npc' | 'helper' | 'robot' | 'cart' | 'placed' | 'gone';

export type TroubleStage =
  | 'waiting' // まだ誰も手を付けていない
  | 'escort' // プレイヤーが一緒に目的地へ向かっている
  | 'collecting' // 散らばった物を拾い集めている
  | 'approach' // ロボットや助っ人が向かっている
  | 'travel' // 困っている人が目的地へ向かっている
  | 'service' // その場で解決中（ドローンのミストなど）
  | 'done';

export interface VehicleState {
  kind: 'robot' | 'pod' | 'drone';
  x: number;
  z: number;
  y: number;
  heading: number;
  points: Point[];
  idx: number;
  visible: boolean;
}

export interface TroubleState {
  /** 困っている様子を見かけた */
  seen: boolean;
  /** 話を聞いた */
  talked: boolean;
  /** 通り過ぎたと記録済み */
  passed: boolean;
  passedAt: number;
  method: HelpMethod | 'auto' | null;
  stage: TroubleStage;
  luggage: LuggageAt;
  collected: boolean[];
  vehicle: VehicleState | null;
  /** 困っている人がシェアカートを押している */
  cartWithNpc: boolean;
  /** 使い終わったカートを置いた場所 */
  cartParked: Point | null;
  timer: number;
}

const createTroubles = (): Record<string, TroubleState> =>
  Object.fromEntries(
    TROUBLES.map((t) => [
      t.id,
      {
        seen: false,
        talked: false,
        passed: false,
        passedAt: 0,
        method: null,
        stage: 'waiting',
        luggage: t.item === 'none' ? 'gone' : 'ground',
        collected: (t.hand.items ?? []).map(() => false),
        vehicle: null,
        cartWithNpc: false,
        cartParked: null,
        timer: 0,
      } satisfies TroubleState,
    ]),
  );

export type FocusKind = 'npc' | 'litter' | 'station' | 'terminal' | 'tower' | 'item' | 'share';

export interface FocusTarget {
  kind: FocusKind;
  id: string;
}

export interface RideState {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  t: number;
  duration: number;
}

export interface LitterState {
  picked: boolean;
  /** 半径内に入ったことがある */
  near: boolean;
  /** 「拾わずに通り過ぎた」と記録済み */
  ignoredCounted: boolean;
}

export interface ContinuousAcc {
  playSeconds: number;
  walkDistance: number;
  moveSeconds: number;
  runSeconds: number;
  zoneSeconds: Record<ZoneId, number>;
  shadeIdleSeconds: number;
  sunIdleSeconds: number;
}

const createAcc = (): ContinuousAcc => ({
  playSeconds: 0,
  walkDistance: 0,
  moveSeconds: 0,
  runSeconds: 0,
  zoneSeconds: { residential: 0, shotengai: 0, plaza: 0, avenue: 0, market: 0 },
  shadeIdleSeconds: 0,
  sunIdleSeconds: 0,
});

const carCount = () => CAR_LANES.length * Math.ceil(124 / CAR_SPACING);

function createRuntime() {
  return {
    player: { x: PLAYER_START[0], z: PLAYER_START[1], heading: Math.PI, speed: 0, running: false },
    camera: { yaw: 0, pitch: 0.42, dist: 8.5 },
    input: {
      keys: new Set<string>(),
      joyX: 0,
      joyY: 0,
      joyActive: false,
      interactQueued: false,
    },
    acc: createAcc(),
    syncTimer: 0,
    ride: null as RideState | null,
    npcPos: Object.fromEntries(NPCS.map((n) => [n.id, { x: n.position[0], z: n.position[1], h: 0 }])) as Record<
      string,
      { x: number; z: number; h: number }
    >,
    npcScript: {} as Record<string, NpcScript | undefined>,
    /** 乗り物に乗っていて見えない NPC */
    npcHidden: new Set<string>(),
    troubles: createTroubles(),
    /** プレイヤーが持っている物（荷物・シェアカート） */
    carrying: null as { kind: 'luggage' | 'cart'; troubleId?: string } | null,
    npcLineIndex: {} as Record<string, number>,
    litter: LITTER.map((): LitterState => ({ picked: false, near: false, ignoredCounted: false })),
    litterVersion: 0,
    cars: new Float32Array(carCount() * 2),
    carCount: carCount(),
    focus: null as FocusTarget | null,
    /** 最後に話しかけた時刻（吹き出しの自動消去用） */
    dialogUntil: 0,
  };
}

export type Runtime = ReturnType<typeof createRuntime>;

export const runtime: Runtime = createRuntime();

/** 新しいゲームのためにランタイムを初期化する */
export function resetRuntime(): void {
  const fresh = createRuntime();
  // 入力状態（押しっぱなしのキーなど）は保持せず全て置き換える
  Object.assign(runtime, fresh);
}
