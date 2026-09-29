// 困りごとの進行。
// プレイヤーには選択肢を見せず、どの方法で助けたか（あるいは通り過ぎたか）だけを静かに記録する。

import type { HelpMethod } from '../data/behaviors';
import { NPC_MAP } from '../data/npcs';
import {
  AUTO_RESOLVE_SEC,
  SHARE_STATIONS,
  TROUBLES,
  TROUBLE_BY_NPC,
  TROUBLE_MAP,
  TROUBLES_BY_HELPER,
  type Point,
  type TroubleDef,
} from '../data/troubles';
import { DIALOG_MS, NPC_AMBIENT_RADIUS } from './constants';
import { runtime, type TroubleState } from './runtime';
import { useGame } from './store';

/** 通り過ぎたとみなす距離 */
const PASS_DISTANCE = 16;
/** 目的地に着いたとみなす距離 */
const ARRIVE_DISTANCE = 3.4;

const VEHICLE_SPEED = { robot: 3.2, pod: 7, drone: 8 } as const;

/** NPC にひとこと言わせる */
export function say(npcId: string, text: string): void {
  runtime.dialogUntil = performance.now() + DIALOG_MS;
  useGame.getState().showDialog(npcId, text);
}

const last = <T,>(arr: T[]): T => arr[arr.length - 1];
const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

function stateOf(t: TroubleDef): TroubleState {
  return runtime.troubles[t.id];
}

/** 記録（通り過ぎた記録は store 側で取り消される） */
function record(t: TroubleDef, method: HelpMethod) {
  const st = stateOf(t);
  st.method = method;
  st.passed = false;
  useGame.getState().recordHelpMethod(method, t.id);
}

// ---- NPC への操作 ----

/** 困っている本人に対する操作ラベル（なければ null） */
export function troubleLabelForNpc(npcId: string): string | null {
  const t = TROUBLE_BY_NPC[npcId];
  if (!t) return null;
  const st = stateOf(t);
  if (st.stage !== 'waiting') return null;
  if (runtime.carrying?.kind === 'cart' && t.share) return 'カートを使ってもらう';
  if (!st.talked) return '話を聞く';
  if (t.hand.kind === 'escort' && !runtime.carrying) return t.hand.label;
  return null;
}

/** 困っている本人に話しかけたとき。処理したら true */
export function interactTroubleNpc(npcId: string): boolean {
  const t = TROUBLE_BY_NPC[npcId];
  if (!t) return false;
  const st = stateOf(t);
  const store = useGame.getState();
  const npc = NPC_MAP[npcId];

  if (st.stage === 'escort') {
    if (t.hand.duringLine) say(npcId, t.hand.duringLine);
    return true;
  }
  if (st.stage !== 'waiting') return false;

  store.recordTalk(npc.type, npc.id);
  st.seen = true;

  // シェアカートを持ってきた
  if (runtime.carrying?.kind === 'cart' && t.share) {
    runtime.carrying = null;
    record(t, 'share');
    st.cartWithNpc = true;
    if (t.item !== 'none') st.luggage = 'cart';
    st.collected = st.collected.map(() => true);
    st.stage = 'travel';
    runtime.npcScript[npcId] = { mode: 'path', points: t.route, idx: 0, speed: 1.4 };
    say(npcId, t.share.useLine);
    return true;
  }

  if (!st.talked) {
    st.talked = true;
    say(npcId, t.explain);
    return true;
  }

  // 自分の手で：一緒に目的地へ
  if (t.hand.kind === 'escort' && !runtime.carrying) {
    record(t, 'hand');
    st.stage = 'escort';
    if (t.hand.carry) {
      st.luggage = 'player';
      runtime.carrying = { kind: 'luggage', troubleId: t.id };
    }
    runtime.npcScript[npcId] = { mode: 'follow' };
    if (t.hand.startLine) say(npcId, t.hand.startLine);
    return true;
  }

  say(npcId, t.explain);
  return true;
}

/** 助っ人に頼める困りごと（見かけていて、まだ誰も手を付けていないもの） */
function pendingForHelper(helperId: string): TroubleDef | null {
  const list = TROUBLES_BY_HELPER[helperId];
  if (!list) return null;
  return list.find((t) => stateOf(t).seen && stateOf(t).stage === 'waiting') ?? null;
}

export function helperLabel(npcId: string): string | null {
  if (runtime.npcScript[npcId]) return null;
  return pendingForHelper(npcId) ? '頼む' : null;
}

/** 近くの人に頼む。処理したら true */
export function askHelper(npcId: string): boolean {
  if (runtime.npcScript[npcId]) return false;
  const t = pendingForHelper(npcId);
  if (!t || !t.neighbor) return false;
  const helper = NPC_MAP[npcId];
  useGame.getState().recordTalk(helper.type, helper.id);
  record(t, 'neighbor');
  const st = stateOf(t);
  st.stage = 'approach';
  const speed = helper.type === 'elder' ? 1.6 : 3.4;
  runtime.npcScript[npcId] = { mode: 'path', points: t.neighbor.approach, idx: 0, speed };
  say(npcId, t.neighbor.askLine);
  return true;
}

// ---- 拾い集める ----

export interface ItemTarget {
  id: string;
  x: number;
  z: number;
}

/** いま拾える物の一覧 */
export function itemTargets(): ItemTarget[] {
  const out: ItemTarget[] = [];
  for (const t of TROUBLES) {
    const st = stateOf(t);
    if (t.hand.kind !== 'collect' || !t.hand.items) continue;
    if (st.stage !== 'waiting' && st.stage !== 'collecting') continue;
    t.hand.items.forEach(([x, z], i) => {
      if (!st.collected[i]) out.push({ id: `${t.id}:${i}`, x, z });
    });
  }
  return out;
}

export function itemPosition(id: string): Point | null {
  const [tid, idx] = id.split(':');
  const p = TROUBLE_MAP[tid]?.hand.items?.[Number(idx)];
  return p ?? null;
}

export function collectItem(id: string): void {
  const [tid, idxStr] = id.split(':');
  const t = TROUBLE_MAP[tid];
  if (!t) return;
  const st = stateOf(t);
  const idx = Number(idxStr);
  if (st.collected[idx] || (st.stage !== 'waiting' && st.stage !== 'collecting')) return;
  st.seen = true;
  if (st.stage === 'waiting') {
    record(t, 'hand');
    st.stage = 'collecting';
  }
  st.collected[idx] = true;
  if (st.collected.every(Boolean)) {
    say(t.npcId, t.hand.doneLine);
    st.luggage = 'npc';
    st.stage = 'done';
    runtime.npcScript[t.npcId] = { mode: 'path', points: t.route, idx: 0, speed: 1.4 };
  }
}

// ---- シェアカート ----

export function shareLabel(): string {
  return runtime.carrying?.kind === 'cart' ? 'カートを返す' : 'カートを借りる';
}

export function useShareStation(stationId: string): void {
  if (!SHARE_STATIONS.some((s) => s.id === stationId)) return;
  if (runtime.carrying?.kind === 'cart') runtime.carrying = null;
  else if (!runtime.carrying) runtime.carrying = { kind: 'cart' };
}

// ---- AI端末から呼ぶ ----

export interface CallableTrouble {
  id: string;
  label: string;
}

/** AI端末から手配できる困りごと（見かけていて、まだ誰も手を付けていないもの） */
export function callableTroubles(): CallableTrouble[] {
  return TROUBLES.filter((t) => stateOf(t).seen && stateOf(t).stage === 'waiting').map((t) => ({
    id: t.id,
    label: t.robot.terminalLabel,
  }));
}

function dispatchVehicle(t: TroubleDef) {
  const st = stateOf(t);
  const [x, z] = t.robot.approach[0];
  st.vehicle = {
    kind: t.robot.vehicle,
    x,
    z,
    y: t.robot.vehicle === 'drone' ? 7 : 0,
    heading: 0,
    points: t.robot.approach,
    idx: 1,
    visible: true,
  };
  st.stage = 'approach';
}

/** AI端末でロボットや乗り物を手配する。返答の文を返す */
export function callRobot(troubleId: string): string | null {
  const t = TROUBLE_MAP[troubleId];
  if (!t || stateOf(t).stage !== 'waiting') return null;
  useGame.getState().recordAiUse();
  record(t, 'robot');
  dispatchVehicle(t);
  return t.robot.terminalReply;
}

// ---- 毎フレームの進行 ----

function moveVehicle(st: TroubleState, dt: number): boolean {
  const v = st.vehicle;
  if (!v) return true;
  if (v.idx >= v.points.length) return true;
  const [tx, tz] = v.points[v.idx];
  const d = dist(v.x, v.z, tx, tz);
  const step = VEHICLE_SPEED[v.kind] * dt;
  if (d <= step) {
    v.x = tx;
    v.z = tz;
    v.idx++;
  } else {
    v.x += ((tx - v.x) / d) * step;
    v.z += ((tz - v.z) / d) * step;
    v.heading = Math.atan2(tx - v.x, tz - v.z);
  }
  return v.idx >= v.points.length;
}

function scriptDone(npcId: string): boolean {
  const s = runtime.npcScript[npcId];
  return !!s && s.mode === 'path' && s.idx >= s.points.length;
}

/** 目的地に着いたときの後片付け */
function finish(t: TroubleDef, st: TroubleState, line: string) {
  say(t.npcId, line);
  st.stage = 'done';
  st.timer = 3;
  if (st.luggage !== 'gone') st.luggage = t.item === 'suitcase' ? 'placed' : 'npc';
  if (st.cartWithNpc) {
    const p = runtime.npcPos[t.npcId];
    st.cartWithNpc = false;
    st.cartParked = [p.x + 1.2, p.z];
  }
  // 助っ人は元の場所へ帰っていく
  if (st.method === 'neighbor' && t.neighbor) {
    const back = [...t.route].reverse().concat([...t.neighbor.approach].reverse());
    runtime.npcScript[t.neighbor.helperId] = { mode: 'path', points: back, idx: 0, speed: 1.4 };
  }
}

function updateTrouble(t: TroubleDef, dt: number, now: number) {
  const st = stateOf(t);
  const p = runtime.player;
  const npc = runtime.npcPos[t.npcId];
  const d = dist(p.x, p.z, npc.x, npc.z);
  const dest = last(t.route);

  if (!st.seen && d < NPC_AMBIENT_RADIUS) st.seen = true;

  switch (st.stage) {
    case 'waiting': {
      // 見かけたのに離れていった → 通り過ぎた
      if (st.seen && !st.passed && !st.method && d > PASS_DISTANCE) {
        st.passed = true;
        st.passedAt = now;
        useGame.getState().recordTroublePassed(t.id);
      }
      // しばらくすると街の仕組みが助けに来る
      if (st.passed && now - st.passedAt > AUTO_RESOLVE_SEC) {
        st.method = 'auto';
        dispatchVehicle(t);
      }
      break;
    }
    case 'escort': {
      if (dist(p.x, p.z, dest[0], dest[1]) < ARRIVE_DISTANCE) {
        if (runtime.carrying?.troubleId === t.id) runtime.carrying = null;
        runtime.npcScript[t.npcId] = { mode: 'path', points: [dest], idx: 0, speed: 2 };
        finish(t, st, t.hand.doneLine);
      }
      break;
    }
    case 'approach': {
      if (st.method === 'neighbor' && t.neighbor) {
        if (scriptDone(t.neighbor.helperId)) {
          say(t.npcId, t.neighbor.arriveLine);
          if (t.item !== 'none') st.luggage = 'helper';
          st.collected = st.collected.map(() => true);
          runtime.npcScript[t.neighbor.helperId] = { mode: 'followNpc', id: t.npcId };
          runtime.npcScript[t.npcId] = { mode: 'path', points: t.route, idx: 0, speed: 1.3 };
          st.stage = 'travel';
        }
        break;
      }
      // ロボット・ポッド・ドローン
      if (moveVehicle(st, dt)) {
        say(t.npcId, st.method === 'auto' ? t.robot.autoLine : t.robot.arriveLine);
        st.collected = st.collected.map(() => true);
        if (!t.robot.travel) {
          st.stage = 'service';
          st.timer = 4.5;
          break;
        }
        if (t.item !== 'none') st.luggage = 'robot';
        const v = st.vehicle!;
        if (v.kind === 'pod') {
          runtime.npcHidden.add(t.npcId);
          v.points = t.route;
          v.idx = 0;
        } else {
          runtime.npcScript[t.npcId] = { mode: 'path', points: t.route, idx: 0, speed: 1.3 };
        }
        st.stage = 'travel';
      }
      break;
    }
    case 'travel': {
      const v = st.vehicle;
      if (v && v.kind === 'pod') {
        // ポッドに乗って目的地へ
        npc.x = v.x;
        npc.z = v.z;
        if (moveVehicle(st, dt)) {
          runtime.npcHidden.delete(t.npcId);
          npc.x = dest[0] + 1.2;
          npc.z = dest[1];
          runtime.npcScript[t.npcId] = { mode: 'path', points: [[dest[0] + 1.2, dest[1]]], idx: 0, speed: 1 };
          finish(t, st, st.method === 'auto' ? t.robot.autoLine : t.robot.doneLine);
        }
        break;
      }
      if (v && v.kind === 'robot') {
        // ロボットは困っている人の横に付き添う
        const side = npc.h + Math.PI / 2;
        const tx = npc.x + Math.sin(side) * 1.1;
        const tz = npc.z + Math.cos(side) * 1.1;
        const k = 1 - Math.exp(-dt * 6);
        v.heading = npc.h;
        v.x += (tx - v.x) * k;
        v.z += (tz - v.z) * k;
      }
      if (scriptDone(t.npcId)) {
        const line =
          st.method === 'neighbor' && t.neighbor
            ? t.neighbor.doneLine
            : st.method === 'share' && t.share
              ? t.share.doneLine
              : st.method === 'auto'
                ? t.robot.autoLine
                : t.robot.doneLine;
        finish(t, st, line);
      }
      break;
    }
    case 'service': {
      st.timer -= dt;
      if (st.timer <= 0) finish(t, st, st.method === 'auto' ? t.robot.autoLine : t.robot.doneLine);
      break;
    }
    case 'done': {
      // 助っ人が元の場所に帰り着いたら、普段どおりに戻す
      if (st.method === 'neighbor' && t.neighbor && scriptDone(t.neighbor.helperId)) {
        runtime.npcScript[t.neighbor.helperId] = undefined;
      }
      // 役目を終えた乗り物は少しして去る
      if (st.vehicle) {
        st.timer -= dt;
        if (st.vehicle.kind === 'drone') st.vehicle.y += dt * 3;
        if (st.timer <= 0) st.vehicle = null;
      }
      break;
    }
    default:
      break;
  }
}

export function updateHelping(dt: number): void {
  const now = runtime.acc.playSeconds;
  for (const t of TROUBLES) updateTrouble(t, dt, now);
}

/** 困っている人の頭上に出すひとこと */
export function troubleAmbient(npcId: string): string | null {
  const t = TROUBLE_BY_NPC[npcId];
  if (!t) return null;
  const st = stateOf(t);
  if (st.stage === 'waiting') return st.talked ? t.explain : t.request;
  if (st.stage === 'done') return t.afterAmbient;
  if (st.stage === 'escort') return t.hand.duringLine ?? null;
  return null;
}

/** プレイヤーが付き添っている目的地（光の輪で示す） */
export function escortDestination(): Point | null {
  for (const t of TROUBLES) {
    if (stateOf(t).stage === 'escort') return last(t.route);
  }
  return null;
}
