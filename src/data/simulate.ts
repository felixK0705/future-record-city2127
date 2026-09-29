// 典型的なプレイヤー行動のサンプルで判定関数を呼び、結末の分布を確認する。
// 開発モードで起動すると、コンソールに各サンプルの結末が出力される。

import { createEmptyLog, type BehaviorLog } from './behaviors';
import { ENDING_MAP, judge, type EndingId } from './endings';

interface Sample {
  label: string;
  /** 想定している結末（確認用） */
  expected: EndingId;
  log: BehaviorLog;
}

/** 4分間（240秒）のプレイを想定したログを作る */
function makeLog(patch: Partial<BehaviorLog>): BehaviorLog {
  return { ...createEmptyLog(), playSeconds: 240, ...patch };
}

export const SAMPLES: Sample[] = [
  {
    label: 'ポッドとAI端末ばかり使い、誰とも話さない人',
    expected: 'optimized',
    log: makeLog({
      walkDistance: 250,
      moveSeconds: 60,
      runSeconds: 5,
      podRides: 5,
      talkedNpcIds: { elder: [], child: [], worker: [], robot: ['robot-guide'] },
      litterIgnored: 3,
      aiUses: 5,
      helpMethods: { hand: [], robot: ['clinic', 'luggage'], neighbor: [], share: [] },
      zoneSeconds: { residential: 20, shotengai: 20, plaza: 60, avenue: 100, market: 40 },
      sunIdleSeconds: 10,
    }),
  },
  {
    label: 'あちこちで話しかけ、困っている人を手伝う人',
    expected: 'engawa',
    log: makeLog({
      walkDistance: 700,
      moveSeconds: 150,
      runSeconds: 10,
      talkedNpcIds: {
        elder: ['elder-bench', 'elder-shop', 'elder-busstop'],
        child: ['child-lot', 'child-plaza'],
        worker: ['worker-market'],
        robot: [],
      },
      helpMethods: { hand: ['luggage'], robot: [], neighbor: ['clinic', 'boxes'], share: [] },
      litterPicked: 1,
      litterIgnored: 1,
      zoneSeconds: { residential: 90, shotengai: 90, plaza: 30, avenue: 10, market: 20 },
      shadeIdleSeconds: 15,
      sunIdleSeconds: 5,
    }),
  },
  {
    label: 'ゆっくり歩いてごみを拾い、木陰で休む人',
    expected: 'forest',
    log: makeLog({
      walkDistance: 900,
      moveSeconds: 200,
      runSeconds: 10,
      talkedNpcIds: { elder: ['elder-market'], child: [], worker: [], robot: [] },
      litterPicked: 7,
      helpMethods: { hand: ['heat'], robot: [], neighbor: [], share: ['boxes'] },
      zoneSeconds: { residential: 50, shotengai: 10, plaza: 80, avenue: 20, market: 80 },
      shadeIdleSeconds: 30,
      sunIdleSeconds: 3,
    }),
  },
  {
    label: '走り回り、大通りと市場を駆け抜ける人',
    expected: 'sky',
    log: makeLog({
      walkDistance: 1000,
      moveSeconds: 220,
      runSeconds: 170,
      talkedNpcIds: { elder: [], child: [], worker: ['worker-traffic', 'worker-phone'], robot: [] },
      litterIgnored: 5,
      troublesPassed: ['boxes', 'clinic'],
      zoneSeconds: { residential: 10, shotengai: 20, plaza: 30, avenue: 90, market: 90 },
      sunIdleSeconds: 20,
    }),
  },
  {
    label: 'どの場所にも少しずつ立ち寄る人',
    expected: 'harmony',
    log: makeLog({
      walkDistance: 400,
      moveSeconds: 120,
      runSeconds: 20,
      podRides: 1,
      talkedNpcIds: { elder: ['elder-bench'], child: ['child-plaza'], worker: [], robot: ['robot-guide'] },
      litterPicked: 2,
      litterIgnored: 2,
      aiUses: 1,
      helpMethods: { hand: ['heat'], robot: [], neighbor: [], share: ['luggage'] },
      troublesPassed: ['clinic'],
      zoneSeconds: { residential: 48, shotengai: 48, plaza: 48, avenue: 48, market: 48 },
      shadeIdleSeconds: 8,
      sunIdleSeconds: 8,
    }),
  },
];

export interface SimulationRow {
  label: string;
  expected: EndingId;
  ending: EndingId;
  endingName: string;
  topBehaviors: string[];
}

/** すべてのサンプルを判定し、結果をコンソールに出力する */
export function runSimulation(print = true): SimulationRow[] {
  const rows = SAMPLES.map((s) => {
    const r = judge(s.log);
    return {
      label: s.label,
      expected: s.expected,
      ending: r.endingId,
      endingName: ENDING_MAP[r.endingId].name,
      topBehaviors: r.topBehaviors,
    };
  });
  if (print) {
    console.log('[シミュレーション] 典型的な行動サンプルごとの結末');
    for (const row of rows) {
      const mark = row.ending === row.expected ? '○' : '×';
      console.log(`${mark} ${row.label} → ${row.endingName}（上位行動: ${row.topBehaviors.join(', ')}）`);
    }
    const covered = new Set(rows.map((r) => r.ending));
    console.log(`[シミュレーション] 到達した結末: ${covered.size} / 5 種類`);
  }
  return rows;
}
