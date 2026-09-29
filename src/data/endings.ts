// 結末の定義と判定ロジック（純粋関数）。
// どの結末にも光と影があり、「代償」として描く。

import {
  BEHAVIORS,
  BEHAVIOR_MAP,
  PARAM_KEYS,
  type BehaviorId,
  type BehaviorLog,
  type FutureVisual,
  type ParamVector,
} from './behaviors';

export type EndingId = 'forest' | 'optimized' | 'engawa' | 'sky' | 'harmony';

export interface EndingDef {
  id: EndingId;
  name: string;
  tagline: string;
  description: string;
  /** この未来が手放したもの */
  cost: string;
  skyColor: string;
  fogColor: string;
  /** 建物を染める色 */
  buildingTint: string;
  /** 地面の色 */
  groundTint: string;
  /** 太陽光の色 */
  lightColor: string;
  /** この結末だけに現れる未来の物 */
  futureObjectName: string;
  visuals: FutureVisual[];
}

export const ENDINGS: EndingDef[] = [
  {
    id: 'forest',
    name: '森と共生する街',
    tagline: '街は、森の一部になった。',
    description:
      'アスファルトは剥がされ、ビルの壁には蔦が這い、屋上は畑と林になりました。夏の広場は木陰で涼しく、ごみという言葉は使われなくなりました。人々は歩き、土に触れ、季節とともに暮らしています。',
    cost: '移動には時間がかかり、夜は暗く、便利さの多くは手放されました。森の速さで生きることを、誰もが選べるわけではありません。',
    skyColor: '#9fd4c8',
    fogColor: '#b9dccb',
    buildingTint: '#7fa67a',
    groundTint: '#6f9a5c',
    lightColor: '#fff2d6',
    futureObjectName: '街を包む巨樹と蔦の住まい',
    visuals: ['megaTrees', 'coolForest', 'greenCorridor'],
  },
  {
    id: 'optimized',
    name: '最適化された静かな街',
    tagline: 'すべてが、ちょうどよく流れている。',
    description:
      'AIが交通も気温もエネルギーも調整し、渋滞も暑さもごみもなくなりました。ポッドは音もなく走り、必要なものは必要なときに届きます。街はいつも清潔で、静かで、正確です。',
    cost: '偶然の出会いや寄り道は減り、人と人が言葉を交わす理由も少なくなりました。静けさは、ときどき少しさびしい。',
    skyColor: '#c9d6ea',
    fogColor: '#dfe6f2',
    buildingTint: '#e8edf5',
    groundTint: '#cfd6e2',
    lightColor: '#ffffff',
    futureObjectName: '街の全てを調律する白いドーム群',
    visuals: ['whiteDomes', 'aiSpire', 'podRail'],
  },
  {
    id: 'engawa',
    name: '縁側でつながる街',
    tagline: '誰かの家の縁側が、みんなの居場所。',
    description:
      '空き家は開かれ、家と家は長い縁側でつながりました。商店街には提灯がともり、お年寄りと子どもが同じ縁側で昼寝をしています。困ったときは、声を出せば誰かが来てくれます。',
    cost: 'ひとりになれる場所は少なく、噂はすぐに広がります。つながりの温かさは、ときに重たさにもなります。',
    skyColor: '#f2c79a',
    fogColor: '#f0d2b0',
    buildingTint: '#c99a6b',
    groundTint: '#b8946c',
    lightColor: '#ffd9a8',
    futureObjectName: '街を一周する長い縁側と提灯',
    visuals: ['engawaDeck', 'lanternStreet', 'helpBells'],
  },
  {
    id: 'sky',
    name: '空へ広がる街',
    tagline: '地上は森に、暮らしは雲の上へ。',
    description:
      '街は空へと伸び、高層タワーと空中の島々が連なりました。人々は高速エレベーターで行き来し、どこへでも自由に、誰よりも速く向かえます。仕事も遊びも、可能性は上へ上へと広がっています。',
    cost: '高い場所に住める人と、そうでない人。空が近くなるほど、地上の足元は見えにくくなりました。',
    skyColor: '#7fb2ec',
    fogColor: '#a9c9ef',
    buildingTint: '#8ea4c8',
    groundTint: '#7b8596',
    lightColor: '#f4f8ff',
    futureObjectName: '雲の上に浮かぶ空中都市',
    visuals: ['skyTowers', 'floatingIslands', 'skyLanes'],
  },
  {
    id: 'harmony',
    name: '調和の街',
    tagline: '少しずつ、ぜんぶ。',
    description:
      '森もあり、ロボットもいて、縁側もあり、高い塔もある。どれかひとつに振り切らず、街はいろいろな暮らし方を少しずつ抱えたまま100年を歩きました。時計塔のまわりには、誰のものでもない庭が広がっています。',
    cost: 'どの課題も「完全には」解決していません。決めきらなかった分だけ、この街はまだ迷い続けています。',
    skyColor: '#b7c7e0',
    fogColor: '#d3d9e4',
    buildingTint: '#c9c2b3',
    groundTint: '#a9b08e',
    lightColor: '#fff4e2',
    futureObjectName: '時計塔を囲む、誰のものでもない庭',
    visuals: ['harmonyGarden', 'coolForest', 'companionBots'],
  },
];

export const ENDING_MAP: Record<EndingId, EndingDef> = Object.fromEntries(
  ENDINGS.map((e) => [e.id, e]),
) as Record<EndingId, EndingDef>;

export function isEndingId(v: string): v is EndingId {
  return v in ENDING_MAP;
}

// ---- 判定 ----

/** 何もしなかった場合に「調和」とみなす合計値のしきい値 */
const MIN_TOTAL = 1.0;
/** 上位2つの差がこの割合未満なら「調和」 */
const HARMONY_MARGIN = 0.18;
/** 経済と自由を合わせて「空へ」とするときの係数 */
const SKY_FACTOR = 0.62;

export interface BehaviorContribution {
  id: BehaviorId;
  /** 0〜1 の行動の強さ（正規化済み） */
  intensity: number;
  /** 未来への影響の大きさ */
  impact: number;
}

export interface JudgeResult {
  endingId: EndingId;
  params: ParamVector;
  topBehaviors: BehaviorId[];
  contributions: BehaviorContribution[];
}

export function computeContributions(log: BehaviorLog): BehaviorContribution[] {
  return BEHAVIORS.map((b) => {
    const intensity = b.measure(log);
    const weightSize = PARAM_KEYS.reduce((s, k) => s + Math.abs(b.weights[k]), 0);
    return { id: b.id, intensity, impact: intensity * weightSize };
  });
}

export function computeParams(contributions: BehaviorContribution[]): ParamVector {
  const p: ParamVector = { environment: 0, connection: 0, economy: 0, technology: 0, freedom: 0 };
  for (const c of contributions) {
    const w = BEHAVIOR_MAP[c.id].weights;
    for (const k of PARAM_KEYS) p[k] += w[k] * c.intensity;
  }
  for (const k of PARAM_KEYS) p[k] = Math.max(0, p[k]);
  return p;
}

export function endingScores(p: ParamVector): Record<Exclude<EndingId, 'harmony'>, number> {
  return {
    forest: p.environment,
    optimized: p.technology,
    engawa: p.connection,
    sky: (p.economy + p.freedom) * SKY_FACTOR,
  };
}

/** パラメータから結末を決める */
export function judgeEnding(p: ParamVector): EndingId {
  const total = PARAM_KEYS.reduce((s, k) => s + p[k], 0);
  if (total < MIN_TOTAL) return 'harmony';
  const ranked = Object.entries(endingScores(p)).sort((a, b) => b[1] - a[1]) as [EndingId, number][];
  const [first, second] = ranked;
  if (first[1] <= 0) return 'harmony';
  if ((first[1] - second[1]) / first[1] < HARMONY_MARGIN) return 'harmony';
  return first[0];
}

/** 影響の大きかった行動を3つ選ぶ（足りない場合は補う） */
export function pickTopBehaviors(contributions: BehaviorContribution[], count = 3): BehaviorId[] {
  const sorted = contributions
    .filter((c) => c.intensity > 0.05)
    .sort((a, b) => b.impact - a.impact)
    .map((c) => c.id);
  const fallback: BehaviorId[] = ['walk', 'stayPlaza', 'restSun', 'restShade', 'stayAvenue'];
  for (const f of fallback) {
    if (sorted.length >= count) break;
    if (!sorted.includes(f)) sorted.push(f);
  }
  return sorted.slice(0, count);
}

/** 行動ログから結末を判定する（純粋関数） */
export function judge(log: BehaviorLog): JudgeResult {
  const contributions = computeContributions(log);
  const params = computeParams(contributions);
  return {
    endingId: judgeEnding(params),
    params,
    topBehaviors: pickTopBehaviors(contributions),
    contributions,
  };
}
