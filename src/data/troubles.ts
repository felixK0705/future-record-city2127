// 街の人の「困りごと」と、その解き方。
// 選択肢は一切出さない。同じ困りごとでも、プレイヤーが自然にとった方法（自分の手・AI・近所の人・シェア）で
// 記録される行動が変わる。何もしなかった場合も「通り過ぎた」として記録され、しばらくすると街の仕組みが解決する。

import type { HelpMethod } from './behaviors';

export type Point = [number, number];

/** 困りごとに付随する荷物の種類 */
export type TroubleItem = 'suitcase' | 'boxes' | 'none';

export interface HandSolution {
  /** escort: 一緒に目的地まで行く ／ collect: 散らばった物を拾い集める */
  kind: 'escort' | 'collect';
  /** 操作ボタンに出す言葉 */
  label: string;
  /** 荷物を自分で持って運ぶ */
  carry?: boolean;
  startLine?: string;
  duringLine?: string;
  doneLine: string;
  /** collect のときに散らばっている物の位置 */
  items?: Point[];
}

export interface RobotSolution {
  /** AI端末に出るボタンの言葉 */
  terminalLabel: string;
  /** AI端末の返答 */
  terminalReply: string;
  vehicle: 'robot' | 'pod' | 'drone';
  /** 乗り物がやって来る道筋（最後が困っている人のそば） */
  approach: Point[];
  /** 乗り物と一緒に目的地へ向かうか（false ならその場で解決） */
  travel: boolean;
  arriveLine: string;
  doneLine: string;
  /** 誰も助けなかったとき、街の仕組みが解決したときの台詞 */
  autoLine: string;
}

export interface NeighborSolution {
  /** 助っ人になる住人 */
  helperId: string;
  /** 頼まれたときの助っ人の返事 */
  askLine: string;
  /** 助っ人の道筋（最後が困っている人のそば） */
  approach: Point[];
  /** 助っ人が来たときの困っている人の台詞 */
  arriveLine: string;
  doneLine: string;
}

export interface ShareSolution {
  /** シェアカート置き場の ID */
  stationId: string;
  useLine: string;
  doneLine: string;
}

export interface TroubleDef {
  id: string;
  npcId: string;
  item: TroubleItem;
  /** 近づくと浮かぶ吹き出し */
  request: string;
  /** 話を聞いたときの説明 */
  explain: string;
  /** 困っている人が目的地へ向かう道筋（最後が目的地） */
  route: Point[];
  /** 解決したあとの吹き出し */
  afterAmbient: string;
  hand: HandSolution;
  robot: RobotSolution;
  neighbor?: NeighborSolution;
  share?: ShareSolution;
}

/** シェアカート置き場 */
export interface ShareStationDef {
  id: string;
  x: number;
  z: number;
  /** 置き場の向き */
  rot: number;
}

export const SHARE_STATIONS: ShareStationDef[] = [
  { id: 'share-res', x: -20.6, z: -51, rot: -Math.PI / 2 },
  { id: 'share-market', x: 4.5, z: 49.6, rot: Math.PI },
];

/** 誰も助けないまま通り過ぎてから、街の仕組みが動き出すまでの秒数 */
export const AUTO_RESOLVE_SEC = 40;

export const TROUBLES: TroubleDef[] = [
  // ---- 住宅街：荷物が重くて家まで運べない ----
  {
    id: 'luggage',
    npcId: 'elder-luggage',
    item: 'suitcase',
    request: 'この荷物、重たくてねえ……家まで運べないのよ。',
    explain: '息子が送ってくれた荷物なんだけど、重くてひとりじゃ運べなくてね。家はこの先の路地を入ったところなんだけど……',
    route: [
      [-24, -37.2],
      [-32.4, -37.2],
      [-32.4, -39.6],
      [-32.6, -40.35],
    ],
    afterAmbient: 'さっきはありがとうね。',
    hand: {
      kind: 'escort',
      label: '荷物を持つ',
      carry: true,
      startLine: 'まあ、持ってくれるのかい？ 助かるよ。家はこの先の路地を左に入ったところよ。',
      duringLine: 'ゆっくりでいいからね。',
      doneLine: 'ここがうちよ。本当にありがとう。今度お茶でも飲みにおいで。',
    },
    robot: {
      terminalLabel: '荷物運びロボットを呼ぶ',
      terminalReply: '荷物運びロボットを向かわせました。まもなく到着します。',
      vehicle: 'robot',
      approach: [
        [-23.8, -58],
        [-23.8, -41],
      ],
      travel: true,
      arriveLine: 'あら、ロボットさんが来てくれたのね。便利な時代になったねえ。',
      doneLine: 'ロボットさん、ありがとうね。……ほんとは誰かとおしゃべりしたかったけど。',
      autoLine: 'あら、見回りのロボットさんが来てくれたわ。',
    },
    neighbor: {
      helperId: 'teen-ball',
      askLine: 'え、あのおばあちゃん？ いいっすよ、ちょっと行ってきます！',
      approach: [
        [-21.8, -26],
        [-21.8, -39.2],
      ],
      arriveLine: 'まあ、若い子が手伝ってくれるなんて。ありがとうねえ。',
      doneLine: 'ありがとうね。あんた、今度うちに遊びにおいで。',
    },
    share: {
      stationId: 'share-res',
      useLine: 'あら、カートを借りてきてくれたの？ これなら自分で運べるわ。',
      doneLine: 'カートって便利ねえ。これからは自分で買い物にも行けそうだわ。',
    },
  },

  // ---- 市場：配達の箱を落としてしまった ----
  {
    id: 'boxes',
    npcId: 'worker-boxes',
    item: 'boxes',
    request: '箱を落としちゃって……ああ、どうしよう。',
    explain: '配達の途中で箱をぶちまけちゃったんです。時間もないのに……',
    route: [
      [20, 47],
      [20, 38.6],
    ],
    afterAmbient: '助かりました。今日はなんとか間に合いそうです！',
    hand: {
      kind: 'collect',
      label: '箱を拾う',
      doneLine: '全部拾ってくれたんですか！ 本当に助かりました。',
      items: [
        [16.4, 48.9],
        [19.9, 45.3],
        [21.4, 48.7],
        [16.6, 45.2],
      ],
    },
    robot: {
      terminalLabel: '運搬ロボットを呼ぶ',
      terminalReply: '運搬ロボットを向かわせました。まもなく到着します。',
      vehicle: 'robot',
      approach: [
        [0, 37],
        [0, 47],
        [16.8, 47],
      ],
      travel: true,
      arriveLine: 'おっ、運搬ロボット！ 呼んでくれたんですか？ 助かります。',
      doneLine: 'ロボットのおかげで間に合いました。便利ですね。',
      autoLine: 'あ、市場の運搬ロボットが来てくれた……よかった。',
    },
    neighbor: {
      helperId: 'child-market',
      askLine: '箱ひろうの？ まかせて！ ぼく、はやいよ！',
      approach: [
        [-8, 56],
        [-8, 47],
        [16.4, 47],
      ],
      arriveLine: 'え、手伝ってくれるの？ ありがとう、ぼうや！',
      doneLine: '二人で拾ったらあっという間だったね。本当にありがとう！',
    },
    share: {
      stationId: 'share-market',
      useLine: 'カートですか！ これなら一回で運べますね。ありがとうございます！',
      doneLine: 'カートのおかげで楽に運べました。返しておきますね。',
    },
  },

  // ---- 商店街：バスが来なくて診療所に行けない ----
  {
    id: 'clinic',
    npcId: 'elder-busstop',
    item: 'none',
    request: 'バスが来なくてねえ……病院に行けないのよ。',
    explain: '通りの奥の診療所に行きたいんだけど、バスが減ってしまってね。歩くと膝が痛くて……',
    route: [
      [40.8, -6],
      [40.8, -54],
      [42.4, -55],
    ],
    afterAmbient: 'さっきはありがとうね。',
    hand: {
      kind: 'escort',
      label: '一緒に歩く',
      startLine: '付き添ってくれるのかい？ ゆっくりしか歩けないけど、いいかねえ。',
      duringLine: 'ふう、こうして誰かと歩くのは久しぶりだよ。',
      doneLine: '着いた着いた。ありがとうね、楽しい道のりだったよ。',
    },
    robot: {
      terminalLabel: '送迎ポッドを手配する',
      terminalReply: '送迎ポッドを手配しました。まもなくバス停に到着します。',
      vehicle: 'pod',
      approach: [
        [40.8, 16],
        [40.8, -4.5],
      ],
      travel: true,
      arriveLine: 'まあ、迎えのポッドが来たよ。ボタンひとつで呼べるなんてねえ。',
      doneLine: 'あっという間に着いたよ。ありがとうね。',
      autoLine: 'あら、自動の送迎ポッドが来たわ。',
    },
    neighbor: {
      helperId: 'elder-shop',
      askLine: 'なに、ハルさんが？ ……よし、店は少し閉めて、わしが付き添おう。',
      approach: [
        [35, -30],
        [40.8, -30],
        [40.8, -7.6],
      ],
      arriveLine: 'あら、豆腐屋さん！ 久しぶりだねえ。一緒に行ってくれるのかい？',
      doneLine: '豆腐屋さんと昔話をしながら来たら、膝の痛いのも忘れちゃったよ。',
    },
  },

  // ---- 中央広場：暑さでふらふらしている ----
  {
    id: 'heat',
    npcId: 'child-plaza',
    item: 'none',
    request: 'あつい……なんだか頭がくらくらする……',
    explain: 'ずっとここで遊んでたら、あつくてフラフラしてきちゃった……',
    route: [
      [9, -6],
      [-4, -9.5],
      [-12, -7],
    ],
    afterAmbient: '木かげって、すずしいんだね！',
    hand: {
      kind: 'escort',
      label: '木かげへ連れていく',
      startLine: 'うん……いっしょに行く。',
      duringLine: 'あっちの木の下、すずしそう……',
      doneLine: 'はあ、すずしい……！ ありがとう、生きかえった！',
    },
    robot: {
      terminalLabel: '冷却ミストドローンを呼ぶ',
      terminalReply: '冷却ミストドローンを派遣しました。',
      vehicle: 'drone',
      approach: [
        [0, 28],
        [9, -6],
      ],
      travel: false,
      arriveLine: 'わあ、ドローンがミストをかけてくれる！ つめたーい！',
      doneLine: 'すずしくなった！ ドローン、ありがとう！',
      autoLine: 'あ、ドローンがミストをかけてくれた……すずしい。',
    },
    neighbor: {
      helperId: 'worker-phone',
      askLine: 'えっ、あの子が？ すぐ行きます。……電話はあとでかけ直します！',
      approach: [
        [-10, 6],
        [-6, -8.5],
        [7.6, -6.6],
      ],
      arriveLine: '日がさ、貸してくれるの？ ありがとう！',
      doneLine: 'いっしょに木かげまで来てくれた！ すずしい〜！',
    },
  },
];

export const TROUBLE_MAP: Record<string, TroubleDef> = Object.fromEntries(TROUBLES.map((t) => [t.id, t]));

/** NPC の ID から、その人の困りごとを引く */
export const TROUBLE_BY_NPC: Record<string, TroubleDef> = Object.fromEntries(TROUBLES.map((t) => [t.npcId, t]));

/** 助っ人になれる住人の ID から、関係する困りごとを引く */
export const TROUBLES_BY_HELPER: Record<string, TroubleDef[]> = TROUBLES.reduce<Record<string, TroubleDef[]>>(
  (acc, t) => {
    if (t.neighbor) (acc[t.neighbor.helperId] ??= []).push(t);
    return acc;
  },
  {},
);

/** 解き方ごとの記録名（コード上の説明用） */
export const HELP_METHOD_NOTE: Record<HelpMethod, string> = {
  hand: '自分の手で助けた',
  robot: 'AI端末でロボットや乗り物を呼んだ',
  neighbor: '近くの人に頼んで一緒に助けた',
  share: 'シェアの道具を借りてきた',
};
