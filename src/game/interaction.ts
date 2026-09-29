// 話す・拾う・乗る・使う・鐘を鳴らす、といった操作の処理

import { NPCS, NPC_MAP } from '../data/npcs';
import { ZONE_MAP } from '../data/zones';
import { CLOCK_TOWER, LITTER, STATIONS, TERMINALS } from './cityData';
import { SHARE_STATIONS } from '../data/troubles';
import { INTERACT_RADIUS, POD_RIDE_SEC } from './constants';
import {
  askHelper,
  callRobot,
  collectItem,
  helperLabel,
  interactTroubleNpc,
  itemTargets,
  say,
  shareLabel,
  troubleLabelForNpc,
  useShareStation,
} from './helping';
import { runtime, type FocusTarget } from './runtime';
import { useGame, type FocusInfo } from './store';

const LITTER_RADIUS = 1.9;
const TERMINAL_RADIUS = 2.4;

function labelFor(target: FocusTarget): string {
  switch (target.kind) {
    case 'npc':
      return troubleLabelForNpc(target.id) ?? helperLabel(target.id) ?? '話す';
    case 'item':
      return '箱を拾う';
    case 'share':
      return shareLabel();
    case 'litter':
      return '拾う';
    case 'station':
      return 'ポッドに乗る';
    case 'terminal':
      return 'AI端末を使う';
    case 'tower':
      return '鐘を鳴らす';
  }
}

/** 一番近い操作対象を探して記録する（毎フレーム） */
export function updateFocus(): void {
  const state = useGame.getState();
  const p = runtime.player;
  let best: FocusTarget | null = null;
  let bestD = Infinity;
  const consider = (kind: FocusTarget['kind'], id: string, d: number, radius: number) => {
    if (d < radius && d < bestD) {
      bestD = d;
      best = { kind, id };
    }
  };

  if (state.phase === 'playing' && runtime.ride === null && state.panel === null) {
    for (const npc of NPCS) {
      if (runtime.npcHidden.has(npc.id)) continue;
      const pos = runtime.npcPos[npc.id];
      consider('npc', npc.id, Math.hypot(pos.x - p.x, pos.z - p.z), INTERACT_RADIUS);
    }
    for (let i = 0; i < LITTER.length; i++) {
      if (runtime.litter[i].picked) continue;
      // ごみは少しだけ優先する
      consider('litter', String(i), Math.hypot(LITTER[i].x - p.x, LITTER[i].z - p.z) - 0.3, LITTER_RADIUS);
    }
    for (const item of itemTargets()) consider('item', item.id, Math.hypot(item.x - p.x, item.z - p.z) - 0.3, LITTER_RADIUS);
    for (const s of SHARE_STATIONS) {
      if (runtime.carrying?.kind === 'luggage') continue;
      consider('share', s.id, Math.hypot(s.x - p.x, s.z - p.z), 2.4);
    }
    // 荷物やカートを持っているあいだはポッドに乗らない
    if (!runtime.carrying) {
      for (const s of STATIONS) consider('station', s.id, Math.hypot(s.x - p.x, s.z - p.z), INTERACT_RADIUS);
    }
    for (const t of TERMINALS) consider('terminal', t.id, Math.hypot(t.x - p.x, t.z - p.z), TERMINAL_RADIUS);
    const towerD = Math.hypot(CLOCK_TOWER.x - p.x, CLOCK_TOWER.z - p.z) - CLOCK_TOWER.size / 2 - 0.6;
    consider('tower', 'tower', towerD, INTERACT_RADIUS);
  }

  const next = best as FocusTarget | null;
  runtime.focus = next;
  const current = state.focus;
  const label = next ? labelFor(next) : '';
  if (!next) {
    if (current) state.setFocus(null);
  } else if (!current || current.kind !== next.kind || current.id !== next.id || current.label !== label) {
    const info: FocusInfo = { kind: next.kind, id: next.id, label };
    state.setFocus(info);
  }
}


/** ポッドに乗って別の場所へ移動する */
export function startRide(fromX: number, fromZ: number, toStationId: string): void {
  const to = STATIONS.find((s) => s.id === toStationId);
  if (!to) return;
  runtime.ride = { fromX, fromZ, toX: to.x, toZ: to.z, t: 0, duration: POD_RIDE_SEC };
  const state = useGame.getState();
  state.recordPodRide();
  state.clearDialog();
  state.setRiding(true);
}

/** 操作ボタン／E キーが押されたとき */
export function interact(): void {
  const state = useGame.getState();
  if (state.phase !== 'playing' || runtime.ride !== null) return;
  const target = runtime.focus;
  if (!target) return;

  switch (target.kind) {
    case 'npc': {
      const npc = NPC_MAP[target.id];
      if (!npc) return;
      // 困っている本人・助っ人への操作を先に処理する
      if (interactTroubleNpc(npc.id)) return;
      if (askHelper(npc.id)) return;
      state.recordTalk(npc.type, npc.id);
      const idx = runtime.npcLineIndex[npc.id] ?? 0;
      runtime.npcLineIndex[npc.id] = idx + 1;
      say(npc.id, npc.lines[idx % npc.lines.length]);
      return;
    }
    case 'litter': {
      const i = Number(target.id);
      const st = runtime.litter[i];
      if (!st || st.picked) return;
      st.picked = true;
      if (st.ignoredCounted) {
        // 一度通り過ぎたごみを戻って拾った場合は取り消す
        st.ignoredCounted = false;
        state.recordLitterIgnored(-1);
      }
      state.recordLitterPicked();
      runtime.litterVersion++;
      return;
    }
    case 'station': {
      const idx = STATIONS.findIndex((s) => s.id === target.id);
      const from = STATIONS[idx];
      const to = STATIONS[(idx + 1) % STATIONS.length];
      startRide(from.x, from.z, to.id);
      return;
    }
    case 'item':
      collectItem(target.id);
      return;
    case 'share':
      useShareStation(target.id);
      return;
    case 'terminal':
      state.openPanel({ kind: 'terminal', id: target.id, answer: null });
      return;
    case 'tower':
      state.openPanel({ kind: 'tower' });
      return;
  }
}

/** AI端末：街のことを尋ねる */
export function askTerminal(terminalId: string): void {
  const term = TERMINALS.find((t) => t.id === terminalId);
  if (!term) return;
  const state = useGame.getState();
  state.recordAiUse();
  const info = ZONE_MAP[term.zone].aiInfo;
  const idx = runtime.npcLineIndex[terminalId] ?? 0;
  runtime.npcLineIndex[terminalId] = idx + 1;
  state.openPanel({ kind: 'terminal', id: terminalId, answer: info[idx % info.length] });
}

/** AI端末：ポッドを呼んで移動する */
export function callPodFromTerminal(terminalId: string): void {
  const term = TERMINALS.find((t) => t.id === terminalId);
  if (!term) return;
  const state = useGame.getState();
  if (runtime.carrying) {
    state.openPanel({ kind: 'terminal', id: terminalId, answer: '荷物やカートをお持ちの間は、ポッドにお乗りいただけません。' });
    return;
  }
  state.recordAiUse();
  state.closePanel();
  const dest = term.zone === 'plaza' ? 'st-market' : 'st-plaza';
  startRide(term.x, term.z, dest);
}

/** AI端末：困っている人のためにロボットや乗り物を手配する */
export function callHelpFromTerminal(terminalId: string, troubleId: string): void {
  const reply = callRobot(troubleId);
  if (reply) useGame.getState().openPanel({ kind: 'terminal', id: terminalId, answer: reply });
}

/** 吹き出しの自動消去（時間経過・離れたとき） */
export function updateDialog(): void {
  const state = useGame.getState();
  const d = state.dialog;
  if (!d) return;
  const pos = runtime.npcPos[d.npcId];
  const far = pos ? Math.hypot(pos.x - runtime.player.x, pos.z - runtime.player.z) > 7 : true;
  if (far || performance.now() > runtime.dialogUntil) state.clearDialog();
}

/** パネルを開いたまま離れたら閉じる */
export function updatePanel(): void {
  const state = useGame.getState();
  const panel = state.panel;
  if (!panel) return;
  const p = runtime.player;
  if (panel.kind === 'terminal') {
    const t = TERMINALS.find((x) => x.id === panel.id);
    if (t && Math.hypot(t.x - p.x, t.z - p.z) > 4) state.closePanel();
  } else if (Math.hypot(CLOCK_TOWER.x - p.x, CLOCK_TOWER.z - p.z) > 7) {
    state.closePanel();
  }
}
