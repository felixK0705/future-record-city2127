// 行動の検知。プレイヤーには何も見せず、裏側で静かに記録する。

import { zoneAt } from '../data/zones';
import { LITTER, TREES } from './cityData';
import {
  GAME_DURATION_SEC,
  IDLE_SPEED,
  LITTER_LEAVE_RADIUS,
  LITTER_PASS_RADIUS,
  SYNC_INTERVAL_SEC,
} from './constants';
import { runtime } from './runtime';
import { useGame } from './store';

export function isInShade(x: number, z: number): boolean {
  for (const t of TREES) {
    if (t.shade > 0 && Math.hypot(t.x - x, t.z - z) < t.shade) return true;
  }
  return false;
}

/** ごみのそばを通ったか・拾わずに離れたかを判定する */
function trackLitter(px: number, pz: number) {
  let ignoredDelta = 0;
  for (let i = 0; i < LITTER.length; i++) {
    const st = runtime.litter[i];
    if (st.picked || st.ignoredCounted) continue;
    const d = Math.hypot(LITTER[i].x - px, LITTER[i].z - pz);
    if (d < LITTER_PASS_RADIUS) {
      st.near = true;
    } else if (st.near && d > LITTER_LEAVE_RADIUS) {
      st.ignoredCounted = true;
      ignoredDelta++;
    }
  }
  if (ignoredDelta > 0) useGame.getState().recordLitterIgnored(ignoredDelta);
}

/** 毎フレーム呼ばれる。連続値は runtime に貯め、1秒ごとに同期する */
export function updateTracker(dt: number): void {
  const state = useGame.getState();
  if (state.phase !== 'playing') return;

  const acc = runtime.acc;
  const p = runtime.player;
  const riding = runtime.ride !== null;

  acc.playSeconds += dt;

  if (!riding) {
    if (p.speed > IDLE_SPEED) {
      acc.moveSeconds += dt;
      acc.walkDistance += p.speed * dt;
      if (p.running) acc.runSeconds += dt;
    } else if (state.panel === null && state.dialog === null) {
      // 会話やパネル操作で立ち止まっている時間は数えない
      if (isInShade(p.x, p.z)) acc.shadeIdleSeconds += dt;
      else acc.sunIdleSeconds += dt;
    }
    trackLitter(p.x, p.z);
  }

  const zone = zoneAt(p.x, p.z);
  if (zone) acc.zoneSeconds[zone] += dt;

  // 1秒ごとに zustand へ同期
  runtime.syncTimer += dt;
  if (runtime.syncTimer >= SYNC_INTERVAL_SEC) {
    runtime.syncTimer = 0;
    state.syncContinuous(acc);
  }

  const remaining = Math.max(0, Math.ceil(GAME_DURATION_SEC - acc.playSeconds));
  if (remaining !== state.remaining) state.setRemaining(remaining);
  if (acc.playSeconds >= GAME_DURATION_SEC) state.endGame();
}
