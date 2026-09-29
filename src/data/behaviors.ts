// 記録する行動の定義。
// 新しい行動を追加したり重みを調整したりするときは、このファイルだけを編集する。
// どの行動にも正解・不正解はなく、それぞれが何らかの未来につながっている。

import type { ZoneId } from './zones';

/** 未来を形づくる5つのパラメータ */
export type ParamKey = 'environment' | 'connection' | 'economy' | 'technology' | 'freedom';

export const PARAM_KEYS: ParamKey[] = ['environment', 'connection', 'economy', 'technology', 'freedom'];

export const PARAM_LABELS: Record<ParamKey, string> = {
  environment: '環境',
  connection: 'つながり',
  economy: '経済',
  technology: 'テクノロジー',
  freedom: '自由',
};

export type ParamVector = Record<ParamKey, number>;

export type NpcType = 'elder' | 'child' | 'worker' | 'robot';

/** 困りごとの解き方（自分の手・AI・近所の人・シェアの道具） */
export type HelpMethod = 'hand' | 'robot' | 'neighbor' | 'share';

export const HELP_METHODS: HelpMethod[] = ['hand', 'robot', 'neighbor', 'share'];

/** 未来の街に現れる立体物の種類（FutureLayer が描画する） */
export type FutureVisual =
  | 'greenCorridor'
  | 'podRail'
  | 'engawaDeck'
  | 'playground'
  | 'lanternStreet'
  | 'companionBots'
  | 'recycleTower'
  | 'cleanDrones'
  | 'coolForest'
  | 'skyLanes'
  | 'shareKitchen'
  | 'helpBells'
  | 'aiSpire'
  | 'skyTowers'
  | 'solarRoofs'
  | 'megaTrees'
  | 'whiteDomes'
  | 'floatingIslands'
  | 'harmonyGarden'
  | 'shareStations';

/** プレイ中に記録される行動ログ */
export interface BehaviorLog {
  /** 実際に遊んだ秒数（正規化に使う） */
  playSeconds: number;
  /** 自分の足で移動した距離（m） */
  walkDistance: number;
  /** 移動していた秒数 */
  moveSeconds: number;
  /** 走っていた秒数 */
  runSeconds: number;
  /** 自動運転ポッドに乗った回数 */
  podRides: number;
  /** 話した NPC の ID（種類別・重複なし） */
  talkedNpcIds: Record<NpcType, string[]>;
  /** 拾ったごみの数 */
  litterPicked: number;
  /** そばを通ったのに拾わなかったごみの数 */
  litterIgnored: number;
  /** 困りごとを解いた方法ごとの、困りごと ID（重複なし） */
  helpMethods: Record<HelpMethod, string[]>;
  /** 困っている人のそばを通り過ぎた困りごと ID */
  troublesPassed: string[];
  /** AI端末を使った回数 */
  aiUses: number;
  /** 各区域に滞在した秒数 */
  zoneSeconds: Record<ZoneId, number>;
  /** 木陰で立ち止まっていた秒数 */
  shadeIdleSeconds: number;
  /** 日なたで立ち止まっていた秒数 */
  sunIdleSeconds: number;
}

export function createEmptyLog(): BehaviorLog {
  return {
    playSeconds: 0,
    walkDistance: 0,
    moveSeconds: 0,
    runSeconds: 0,
    podRides: 0,
    talkedNpcIds: { elder: [], child: [], worker: [], robot: [] },
    litterPicked: 0,
    litterIgnored: 0,
    helpMethods: { hand: [], robot: [], neighbor: [], share: [] },
    troublesPassed: [],
    aiUses: 0,
    zoneSeconds: { residential: 0, shotengai: 0, plaza: 0, avenue: 0, market: 0 },
    shadeIdleSeconds: 0,
    sunIdleSeconds: 0,
  };
}

export type BehaviorId =
  | 'walk'
  | 'pod'
  | 'talkElder'
  | 'talkChild'
  | 'talkWorker'
  | 'talkRobot'
  | 'pickLitter'
  | 'ignoreLitter'
  | 'stayResidential'
  | 'stayShotengai'
  | 'stayPlaza'
  | 'stayAvenue'
  | 'stayMarket'
  | 'helpByHand'
  | 'helpByRobot'
  | 'helpByNeighbor'
  | 'helpByShare'
  | 'passTrouble'
  | 'aiTerminal'
  | 'run'
  | 'restShade'
  | 'restSun';

export interface FutureObject {
  /** 100年後にあるもの */
  name: string;
  /** 未来の街に描画する立体物 */
  visual: FutureVisual;
}

export interface BehaviorDef {
  id: BehaviorId;
  /** 日本語の行動名 */
  name: string;
  /** 5つのパラメータへの重み */
  weights: ParamVector;
  /** この行動がつながる「100年後にあるもの」 */
  futureObject: FutureObject;
  /** 「あなたの足あと」画面での説明文 */
  revealText: string;
  /**
   * 行動の強さを 0〜1 で返す。
   * プレイ時間で正規化し、上限を設けて同じ行動の繰り返しで稼げないようにする。
   */
  measure: (log: BehaviorLog) => number;
}

// ---- 正規化のためのヘルパー ----

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

/** 遊んだ分数（短すぎるプレイで値が跳ねないよう最低1分） */
const minutes = (log: BehaviorLog) => Math.max(1, log.playSeconds / 60);

/** 標準プレイ時間（4分）に対する割合。短いプレイほど少ない回数で満たされる */
const timeFactor = (log: BehaviorLog) => Math.min(1, Math.max(0.4, minutes(log) / 4));

/** 回数系の行動：上限付き・プレイ時間で換算 */
const countMeasure = (count: number, full: number, log: BehaviorLog, hardCap = full * 2) =>
  clamp01(Math.min(count, hardCap) / (full * timeFactor(log)));

/** 区域の滞在割合：10%未満は0、45%で1 */
const zoneShare = (log: BehaviorLog, zone: ZoneId) =>
  clamp01((log.zoneSeconds[zone] / Math.max(1, log.playSeconds) - 0.1) / 0.35);

const vec = (p: Partial<ParamVector>): ParamVector => ({
  environment: 0,
  connection: 0,
  economy: 0,
  technology: 0,
  freedom: 0,
  ...p,
});

export const BEHAVIORS: BehaviorDef[] = [
  {
    id: 'walk',
    name: '自分の足で歩いた',
    weights: vec({ environment: 1.2, connection: 0.4, technology: -0.3, freedom: 0.6 }),
    futureObject: { name: '街をめぐる緑の回廊', visual: 'greenCorridor' },
    revealText:
      'あなたはこの街を自分の足で歩きました。100年後、車道だった場所は木々のアーチが続く歩道になり、人は歩くことで街と出会い直しています。',
    measure: (log) => clamp01(log.walkDistance / (minutes(log) * 250)),
  },
  {
    id: 'pod',
    name: '自動運転ポッドに乗った',
    weights: vec({ environment: 0.2, connection: -0.3, economy: 0.6, technology: 1.4, freedom: 0.2 }),
    futureObject: { name: '空中を走るポッドの環状線', visual: 'podRail' },
    revealText:
      'あなたは自動運転ポッドで街を移動しました。100年後、渋滞は昔話になり、静かなポッドが空中のレールを途切れなく巡っています。',
    measure: (log) => clamp01(Math.min(log.podRides, 6) / (1 + minutes(log) * 0.75)),
  },
  {
    id: 'talkElder',
    name: 'お年寄りと話した',
    weights: vec({ environment: 0.2, connection: 1.5, technology: -0.2 }),
    futureObject: { name: '家々をつなぐ縁側', visual: 'engawaDeck' },
    revealText:
      'あなたはひとりで過ごすお年寄りに声をかけました。100年後、家と家は長い縁側でつながり、誰もがふらりと腰かけて話せる街になっています。',
    measure: (log) => countMeasure(log.talkedNpcIds.elder.length, 3, log),
  },
  {
    id: 'talkChild',
    name: '子どもと話した',
    weights: vec({ environment: 0.3, connection: 1.0, freedom: 0.6 }),
    futureObject: { name: '子どもが設計する遊び場', visual: 'playground' },
    revealText:
      'あなたは子どもの話に耳を傾けました。100年後、街のあちこちに子どもたち自身が考えた遊び場があり、大人も一緒に遊んでいます。',
    measure: (log) => countMeasure(log.talkedNpcIds.child.length, 2, log),
  },
  {
    id: 'talkWorker',
    name: '働く人と話した',
    weights: vec({ connection: 0.6, economy: 0.9, freedom: 0.2 }),
    futureObject: { name: '灯りの消えない商店街', visual: 'lanternStreet' },
    revealText:
      'あなたは忙しく働く人と言葉を交わしました。100年後、商店街には仕事と暮らしが混ざり合い、夜遅くまで灯りがともっています。',
    measure: (log) => countMeasure(log.talkedNpcIds.worker.length, 2, log),
  },
  {
    id: 'talkRobot',
    name: 'ロボットと話した',
    weights: vec({ connection: 0.4, technology: 1.2, freedom: 0.1 }),
    futureObject: { name: '一人ひとりに寄り添う相棒ロボット', visual: 'companionBots' },
    revealText:
      'あなたはロボットにも話しかけました。100年後、ロボットは道具ではなく、人のそばで暮らす相棒として街を歩いています。',
    measure: (log) => countMeasure(log.talkedNpcIds.robot.length, 2, log),
  },
  {
    id: 'pickLitter',
    name: 'ごみを拾った',
    weights: vec({ environment: 1.4, connection: 0.3 }),
    futureObject: { name: 'ごみを資源に還す循環塔', visual: 'recycleTower' },
    revealText:
      'あなたは足元のごみを拾いました。100年後、街の中心には循環塔が立ち、捨てられるものはひとつもなく、すべてが次の何かに生まれ変わります。',
    measure: (log) => countMeasure(log.litterPicked, 5, log),
  },
  {
    id: 'ignoreLitter',
    name: 'ごみのそばを通り過ぎた',
    weights: vec({ environment: -0.3, economy: 0.4, technology: 0.8, freedom: 0.5 }),
    futureObject: { name: '街を見守る自律清掃ドローン', visual: 'cleanDrones' },
    revealText:
      'あなたはごみに気を取られず、自分の行きたい方へ進みました。100年後、掃除は小さなドローンたちの仕事になり、人は自分の時間を生きています。',
    measure: (log) => countMeasure(log.litterIgnored, 5, log),
  },
  {
    id: 'stayResidential',
    name: '住宅街で過ごした',
    weights: vec({ environment: 0.3, connection: 0.6 }),
    futureObject: { name: '空き家を開いた縁側カフェ', visual: 'engawaDeck' },
    revealText:
      'あなたは空き家の目立つ住宅街で時間を過ごしました。100年後、空き家は誰でも入れる縁側カフェや小さな図書館に生まれ変わっています。',
    measure: (log) => zoneShare(log, 'residential'),
  },
  {
    id: 'stayShotengai',
    name: '商店街で過ごした',
    weights: vec({ connection: 0.7, economy: 0.5 }),
    futureObject: { name: '多世代が集う提灯通り', visual: 'lanternStreet' },
    revealText:
      'あなたはシャッターの多い商店街にとどまりました。100年後、そこはお年寄りと若者が一緒に店を開く、にぎやかな提灯通りになっています。',
    measure: (log) => zoneShare(log, 'shotengai'),
  },
  {
    id: 'stayPlaza',
    name: '広場で過ごした',
    weights: vec({ environment: 0.6, freedom: 0.5 }),
    futureObject: { name: '風が通り抜ける冷却の森', visual: 'coolForest' },
    revealText:
      'あなたは照りつける広場で時間を過ごしました。100年後、広場は森になり、真夏でも木々の間を涼しい風が通り抜けています。',
    measure: (log) => zoneShare(log, 'plaza'),
  },
  {
    id: 'stayAvenue',
    name: '大通りで過ごした',
    weights: vec({ economy: 0.6, technology: 0.6, freedom: 0.2 }),
    futureObject: { name: '空に重なる立体交通レーン', visual: 'skyLanes' },
    revealText:
      'あなたは渋滞する大通りに長くいました。100年後、道路は何層にも重なり、人と物がそれぞれの高さを滑らかに行き交っています。',
    measure: (log) => zoneShare(log, 'avenue'),
  },
  {
    id: 'stayMarket',
    name: '市場で過ごした',
    weights: vec({ environment: 0.4, economy: 0.8, connection: 0.2 }),
    futureObject: { name: '余った食材で誰もが食べられるシェアキッチン', visual: 'shareKitchen' },
    revealText:
      'あなたは市場の喧騒の中にいました。100年後、売れ残りは捨てられず、大きな屋根の下のシェアキッチンで誰かの夕食になっています。',
    measure: (log) => zoneShare(log, 'market'),
  },
  {
    id: 'helpByHand',
    name: '自分の手で困っている人を助けた',
    weights: vec({ environment: 0.3, connection: 1.3, freedom: 0.1 }),
    futureObject: { name: '誰もが手を貸し合う縁側の小道', visual: 'engawaDeck' },
    revealText:
      'あなたは困っている人の荷物を持ち、隣を一緒に歩きました。100年後、家々の軒先は縁側の小道でつながり、重い荷物は自然と誰かの手から手へ渡っていきます。',
    measure: (log) => countMeasure(log.helpMethods.hand.length, 2, log),
  },
  {
    id: 'helpByRobot',
    name: 'AIに頼んで困っている人を助けた',
    weights: vec({ economy: 0.5, technology: 1.3 }),
    futureObject: { name: '呼べばすぐに来る見守りロボット', visual: 'companionBots' },
    revealText:
      'あなたは困っている人のために、AI端末からロボットや乗り物を呼びました。100年後、誰かが困った瞬間にロボットが駆けつけ、助けを待つ人はいなくなりました。',
    measure: (log) => countMeasure(log.helpMethods.robot.length, 2, log),
  },
  {
    id: 'helpByNeighbor',
    name: '近くの人を巻き込んで助けた',
    weights: vec({ connection: 1.6, freedom: 0.1 }),
    futureObject: { name: '鳴らせば近所が駆けつける灯りの鈴', visual: 'helpBells' },
    revealText:
      'あなたは近くにいた人に声をかけ、一緒に困りごとを解きました。100年後、街角には「灯りの鈴」があり、鳴らせば近所の誰かが必ず駆けつけてくれます。',
    measure: (log) => countMeasure(log.helpMethods.neighbor.length, 2, log),
  },
  {
    id: 'helpByShare',
    name: 'シェアの道具で困りごとを解いた',
    weights: vec({ environment: 0.9, connection: 0.5, economy: 0.3 }),
    futureObject: { name: '街じゅうにあるシェアステーション', visual: 'shareStations' },
    revealText:
      'あなたはシェアカートを借りてきて、困っている人が自分で動けるようにしました。100年後、街のあちこちにシェアステーションがあり、誰もが必要な道具を必要なときだけ使っています。',
    measure: (log) => countMeasure(log.helpMethods.share.length, 2, log),
  },
  {
    id: 'passTrouble',
    name: '困っている人のそばを通り過ぎた',
    weights: vec({ economy: 0.3, technology: 0.5, freedom: 0.9 }),
    futureObject: { name: '困りごとを先回りして解く街のAI', visual: 'aiSpire' },
    revealText:
      'あなたは困っている人のそばを、自分のペースで通り過ぎました。そのあと、街の仕組みがその人を助けました。100年後、街のAIが困りごとを先回りして見つけ、誰かが立ち止まらなくても助けが届きます。',
    measure: (log) => countMeasure(log.troublesPassed.length, 2, log),
  },
  {
    id: 'aiTerminal',
    name: 'AI端末を使った',
    weights: vec({ economy: 0.4, technology: 1.3, freedom: -0.1 }),
    futureObject: { name: '街全体を見渡すAIの尖塔', visual: 'aiSpire' },
    revealText:
      'あなたはAI端末に街のことを尋ねました。100年後、街の中心にはAIの尖塔が立ち、交通も気温もエネルギーも、静かに最適化されています。',
    measure: (log) => countMeasure(log.aiUses, 3, log, 8),
  },
  {
    id: 'run',
    name: '走って移動した',
    weights: vec({ environment: -0.2, economy: 1.0, technology: 0.3, freedom: 0.8 }),
    futureObject: { name: '雲まで届く高層タワー', visual: 'skyTowers' },
    revealText:
      'あなたはこの街を駆け抜けました。100年後、街は空へと伸び、人は高速のエレベーターで雲の上の職場や住まいへ向かっています。',
    measure: (log) => {
      if (log.moveSeconds < 10) return 0;
      return clamp01((log.runSeconds / log.moveSeconds - 0.15) / 0.55);
    },
  },
  {
    id: 'restShade',
    name: '木陰で立ち止まった',
    weights: vec({ environment: 1.2, connection: 0.2 }),
    futureObject: { name: '街を覆う木陰の森', visual: 'coolForest' },
    revealText:
      'あなたは木陰で足を止めました。100年後、街には大きな木々が茂り、どこを歩いても木漏れ日の下にいられます。',
    measure: (log) => clamp01(log.shadeIdleSeconds / (Math.max(60, log.playSeconds) * 0.12)),
  },
  {
    id: 'restSun',
    name: '日なたで立ち止まった',
    weights: vec({ economy: 0.3, technology: 0.5, freedom: 0.9 }),
    futureObject: { name: '光を集める陽だまり発電の屋根', visual: 'solarRoofs' },
    revealText:
      'あなたは強い日差しの中でも立ち止まりました。100年後、屋根という屋根が陽の光を集め、街は太陽の力で動いています。',
    measure: (log) => clamp01(log.sunIdleSeconds / (Math.max(60, log.playSeconds) * 0.12)),
  },
];

export const BEHAVIOR_MAP: Record<BehaviorId, BehaviorDef> = Object.fromEntries(
  BEHAVIORS.map((b) => [b.id, b]),
) as Record<BehaviorId, BehaviorDef>;

export function isBehaviorId(v: string): v is BehaviorId {
  return v in BEHAVIOR_MAP;
}
