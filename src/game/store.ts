// zustand ストア：画面の状態と行動ログ（BehaviorLog）を保持する。

import { create } from 'zustand';
import { createEmptyLog, type BehaviorId, type BehaviorLog, type HelpMethod, type NpcType } from '../data/behaviors';
import { judge, type EndingId } from '../data/endings';
import { GAME_DURATION_SEC } from './constants';
import { resetRuntime, runtime, type ContinuousAcc, type FocusKind } from './runtime';

export type Phase = 'title' | 'playing' | 'timeleap' | 'ending' | 'reveal';

export interface FocusInfo {
  kind: FocusKind;
  id: string;
  label: string;
}

export interface DialogInfo {
  npcId: string;
  text: string;
  /** 同じ台詞でも再表示できるよう毎回変える */
  key: number;
}

export type PanelState = { kind: 'terminal'; id: string; answer: string | null } | { kind: 'tower' } | null;

export interface GameResult {
  endingId: EndingId;
  topBehaviors: BehaviorId[];
}

interface GameState {
  phase: Phase;
  remaining: number;
  log: BehaviorLog;
  focus: FocusInfo | null;
  dialog: DialogInfo | null;
  panel: PanelState;
  riding: boolean;
  result: GameResult | null;
  /** 共有 URL から開いた */
  fromShare: boolean;
  /** 100年後の街を表示している */
  future: boolean;
  setFuture: (future: boolean) => void;

  startGame: () => void;
  endGame: () => void;
  showEnding: () => void;
  showReveal: () => void;
  loadShared: (result: GameResult) => void;

  setRemaining: (sec: number) => void;
  setFocus: (focus: FocusInfo | null) => void;
  showDialog: (npcId: string, text: string) => void;
  clearDialog: () => void;
  openPanel: (panel: PanelState) => void;
  closePanel: () => void;
  setRiding: (riding: boolean) => void;

  // ---- 行動の記録（離散的なイベントは即座に反映） ----
  recordTalk: (type: NpcType, npcId: string) => void;
  /** 困りごとを解いた方法を記録（通り過ぎた記録は取り消す） */
  recordHelpMethod: (method: HelpMethod, troubleId: string) => void;
  /** 困っている人のそばを通り過ぎたことを記録 */
  recordTroublePassed: (troubleId: string) => void;
  recordLitterPicked: () => void;
  recordLitterIgnored: (delta: number) => void;
  recordPodRide: () => void;
  recordAiUse: () => void;
  /** 連続値を runtime から同期（1秒ごと） */
  syncContinuous: (acc: ContinuousAcc) => void;
}

let dialogCounter = 0;

export const useGame = create<GameState>()((set, get) => ({
  phase: 'title',
  remaining: GAME_DURATION_SEC,
  log: createEmptyLog(),
  focus: null,
  dialog: null,
  panel: null,
  riding: false,
  result: null,
  fromShare: false,
  future: false,

  setFuture: (future) => set({ future }),

  startGame: () => {
    resetRuntime();
    set({
      phase: 'playing',
      remaining: GAME_DURATION_SEC,
      log: createEmptyLog(),
      focus: null,
      dialog: null,
      panel: null,
      riding: false,
      result: null,
      fromShare: false,
      future: false,
    });
  },

  endGame: () => {
    if (get().phase !== 'playing') return;
    // 最後の連続値を反映してから判定する
    get().syncContinuous(runtime.acc);
    const r = judge(get().log);
    if (import.meta.env.DEV) {
      console.log('[判定]', r.endingId, r.params, r.contributions.filter((c) => c.intensity > 0));
    }
    set({
      phase: 'timeleap',
      result: { endingId: r.endingId, topBehaviors: r.topBehaviors },
      focus: null,
      dialog: null,
      panel: null,
      riding: false,
    });
  },

  showEnding: () => set({ phase: 'ending' }),
  showReveal: () => set({ phase: 'reveal' }),
  loadShared: (result) => set({ phase: 'reveal', result, fromShare: true, future: true }),

  setRemaining: (sec) => set({ remaining: sec }),
  setFocus: (focus) => set({ focus }),
  showDialog: (npcId, text) => set({ dialog: { npcId, text, key: ++dialogCounter } }),
  clearDialog: () => set({ dialog: null }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
  setRiding: (riding) => set({ riding }),

  recordTalk: (type, npcId) =>
    set((s) => {
      if (s.log.talkedNpcIds[type].includes(npcId)) return s;
      return {
        log: { ...s.log, talkedNpcIds: { ...s.log.talkedNpcIds, [type]: [...s.log.talkedNpcIds[type], npcId] } },
      };
    }),
  recordHelpMethod: (method, troubleId) =>
    set((s) => {
      if (s.log.helpMethods[method].includes(troubleId)) return s;
      return {
        log: {
          ...s.log,
          helpMethods: { ...s.log.helpMethods, [method]: [...s.log.helpMethods[method], troubleId] },
          troublesPassed: s.log.troublesPassed.filter((id) => id !== troubleId),
        },
      };
    }),
  recordTroublePassed: (troubleId) =>
    set((s) =>
      s.log.troublesPassed.includes(troubleId)
        ? s
        : { log: { ...s.log, troublesPassed: [...s.log.troublesPassed, troubleId] } },
    ),
  recordLitterPicked: () => set((s) => ({ log: { ...s.log, litterPicked: s.log.litterPicked + 1 } })),
  recordLitterIgnored: (delta) =>
    set((s) => ({ log: { ...s.log, litterIgnored: Math.max(0, s.log.litterIgnored + delta) } })),
  recordPodRide: () => set((s) => ({ log: { ...s.log, podRides: s.log.podRides + 1 } })),
  recordAiUse: () => set((s) => ({ log: { ...s.log, aiUses: s.log.aiUses + 1 } })),
  syncContinuous: (acc) =>
    set((s) => ({
      log: {
        ...s.log,
        playSeconds: acc.playSeconds,
        walkDistance: acc.walkDistance,
        moveSeconds: acc.moveSeconds,
        runSeconds: acc.runSeconds,
        zoneSeconds: { ...acc.zoneSeconds },
        shadeIdleSeconds: acc.shadeIdleSeconds,
        sunIdleSeconds: acc.sunIdleSeconds,
      },
    })),
}));
