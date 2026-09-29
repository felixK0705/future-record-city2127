// 街の住人たち。台詞と配置はここで編集する。

import type { NpcType } from './behaviors';
import type { ZoneId } from './zones';

export interface NpcDef {
  id: string;
  type: NpcType;
  zone: ZoneId;
  /** 初期位置 [x, z] */
  position: [number, number];
  /** 歩き回る半径（0 なら動かない） */
  wander: number;
  /** 座っているかどうか */
  sitting?: boolean;
  /** 服の色 */
  color: string;
  /** 近づいたときに浮かぶひとこと */
  ambient: string;
  /** 話しかけたときの台詞（話すたびに順番に進む）。困りごとがある人は、解決したあとの台詞 */
  lines: string[];
}

/** 同時に存在できる NPC の上限（スマートフォンでの負荷対策） */
export const MAX_NPCS = 18;

export const NPC_TYPE_LABEL: Record<NpcType, string> = {
  elder: 'お年寄り',
  child: '子ども',
  worker: '会社員',
  robot: 'ロボット',
};

const ALL_NPCS: NpcDef[] = [
  // ---- 住宅街 ----
  {
    id: 'elder-bench',
    type: 'elder',
    zone: 'residential',
    position: [-43, -19],
    wander: 0,
    sitting: true,
    color: '#8a7a9c',
    ambient: '……今日も静かだねえ。',
    lines: [
      'おや、話しかけてくれるのかい。ありがとうねえ。',
      'この向かいの家もね、去年から誰も住んでいないのよ。',
      '昔はこの通り、夕方になると子どもの声でいっぱいだったんだけどねえ。',
      'また通りかかったら、声をかけておくれ。',
    ],
  },
  {
    id: 'elder-luggage',
    type: 'elder',
    zone: 'residential',
    position: [-24, -40],
    wander: 0,
    color: '#6f8a7a',
    ambient: 'よいしょ……重たいねえ……',
    lines: [
      'この辺りは空き家ばかりで、頼める人がいなくてねえ。',
      '息子は遠くに住んでいてね。年に一度帰ってくるかどうかさ。',
      '今日は久しぶりに、たくさん人と話した気がするよ。',
    ],
  },
  {
    id: 'child-lot',
    type: 'child',
    zone: 'residential',
    position: [-43, 1],
    wander: 4,
    color: '#f2a541',
    ambient: 'ねえ、あの空き家って、おばけ出るのかな？',
    lines: [
      'ここ、前は家だったんだって。いまは草ぼうぼう！',
      'ぼくね、ここに秘密基地つくりたいんだ。',
      '大人になったら、空き家ぜんぶ遊び場にする！',
    ],
  },
  {
    id: 'teen-ball',
    type: 'child',
    zone: 'residential',
    position: [-21.8, -26],
    wander: 1.5,
    color: '#2b3550',
    ambient: 'よっ、ほっ……リフティング、20回いけるかな。',
    lines: [
      '部活の自主練っす。この道、車あんまり来ないんで。',
      'この辺、空き家多いっすよね。夜はちょっと不気味っていうか。',
      'ばあちゃん家もこの近くなんすよ。最近あんまり行けてないけど。',
    ],
  },
  {
    id: 'worker-home',
    type: 'worker',
    zone: 'residential',
    position: [-37.5, -50],
    wander: 3,
    color: '#4a6fa5',
    ambient: '実家、どうしようかなあ……',
    lines: [
      '親から相続した家なんですけど、遠くに住んでいて管理できなくて。',
      '売るにも貸すにも手続きが大変で、そのままになってるんです。',
      '誰かが使ってくれたら、家も喜ぶと思うんですけどね。',
    ],
  },

  // ---- 商店街 ----
  {
    id: 'elder-shop',
    type: 'elder',
    zone: 'shotengai',
    position: [35, -30],
    wander: 0,
    color: '#a0675a',
    ambient: 'いらっしゃい……って、もう誰も来ないか。',
    lines: [
      'うちは創業60年の豆腐屋でね。でも継ぐ人がいないんだ。',
      '隣の店も向かいの店も、シャッターが下りたままさ。',
      '一日中、誰とも話さない日もあるよ。今日はあんたと話せてよかった。',
    ],
  },
  {
    id: 'elder-busstop',
    type: 'elder',
    zone: 'shotengai',
    position: [42, -6],
    wander: 0,
    sitting: true,
    color: '#7c6f99',
    ambient: 'バス、もう来ないのかねえ……',
    lines: [
      'このバス停、去年から本数が減ってねえ。病院に行くのもひと苦労さ。',
      '免許は返しちゃったし、歩くのもしんどくてね。',
      'こうして座ってるとね、誰かが話しかけてくれるのを待ってるのかもしれないねえ。',
    ],
  },
  {
    id: 'child-shop',
    type: 'child',
    zone: 'shotengai',
    position: [38, -48],
    wander: 4,
    color: '#e86f68',
    ambient: 'おかし屋さん、また閉まってる〜',
    lines: [
      'ここのおかし屋さん、先月やめちゃったんだ。',
      'おばあちゃんがね、昔はこの通りでお祭りやってたって言ってた！',
      'お祭り、またやったらいいのにね。',
    ],
  },
  {
    id: 'robot-delivery',
    type: 'robot',
    zone: 'shotengai',
    position: [40, 4],
    wander: 5,
    color: '#b8c4d6',
    ambient: 'お届け物を配達中です。少しだけ道をあけていただけますか？',
    lines: [
      'わたしは配達ロボットです。今日はこれで42件目のお届けになります。',
      'この地域では、買い物に行けないお年寄りが増えているんです。',
      '荷物はお届けできます。でも、おしゃべりまではお届けできないんですよね。',
    ],
  },

  // ---- 中央広場 ----
  {
    id: 'child-plaza',
    type: 'child',
    zone: 'plaza',
    position: [9, -6],
    wander: 0,
    color: '#5bb56f',
    ambient: 'あっつ〜い！ 地面がやけどしそう！',
    lines: [
      'この広場、夏はあつすぎて遊べないんだ。',
      'あっちの木の下はすずしいよ！ ちょっとしかないけど。',
      'ぜんぶ森だったらいいのになあ。',
    ],
  },
  {
    id: 'worker-phone',
    type: 'worker',
    zone: 'plaza',
    position: [-10, 6],
    wander: 2,
    color: '#3e5a7a',
    ambient: 'はい、すみません、渋滞で遅れてまして……',
    lines: [
      '毎朝この広場を横切って、木陰で一息つくのが日課なんです。',
      '暑い日は、ここの数本の木に人が集まっちゃって。',
      '仕事、もう少しゆっくりできたらいいんですけどね。',
    ],
  },
  {
    id: 'robot-guide',
    type: 'robot',
    zone: 'plaza',
    position: [7, 11],
    wander: 3,
    color: '#d8e2ef',
    ambient: '何かご案内しましょうか？',
    lines: [
      'ようこそ。わたしはこの広場の案内ロボットです。',
      '中央の時計塔で鐘を鳴らすと、一日が終わります。',
      '自動運転ポッドの乗り場は、広場の南東と大通り沿いにありますよ。',
    ],
  },

  // ---- 大通り ----
  {
    id: 'worker-traffic',
    type: 'worker',
    zone: 'avenue',
    position: [-20, 19.5],
    wander: 3,
    color: '#5a6b8c',
    ambient: 'また渋滞か……会議に間に合わない……',
    lines: [
      '毎日この渋滞で、1時間は無駄にしてますよ。',
      'みんな一人ずつ車に乗ってるから、こうなるんですよね。わかってはいるんですけど。',
      '空でも飛べたら、って本気で思います。',
    ],
  },
  {
    id: 'robot-traffic',
    type: 'robot',
    zone: 'avenue',
    position: [30, 32.5],
    wander: 4,
    color: '#c9d3e0',
    ambient: 'ただいま交通状況を分析しています……',
    lines: [
      'いまの平均速度は時速4キロ。歩くのとほとんど変わりません。',
      'すべての車が自動運転になれば、渋滞は87パーセント減ると予測されています。',
      'あなたは、歩くほうがお好きですか？',
    ],
  },

  // ---- 市場 ----
  {
    id: 'elder-market',
    type: 'elder',
    zone: 'market',
    position: [-36, 47],
    wander: 0,
    color: '#9c6b4f',
    ambient: '売れ残っちゃったねえ……もったいない。',
    lines: [
      'この大根、ちょっと曲がってるだけで売れないんだよ。味は一緒なのにねえ。',
      '閉店の時間になると、まだ食べられるものをたくさん捨てるのさ。',
      '誰かのごはんになれたら、野菜も本望だろうにねえ。',
    ],
  },
  {
    id: 'worker-boxes',
    type: 'worker',
    zone: 'market',
    position: [18, 47],
    wander: 0,
    color: '#6a7fa8',
    ambient: 'うわ、やっちゃった……',
    lines: [
      '人手が足りなくて、一人で全部運んでるんですよ。',
      '市場の配達、最近は毎日時間との勝負なんです。',
    ],
  },
  {
    id: 'child-market',
    type: 'child',
    zone: 'market',
    position: [-8, 56],
    wander: 4,
    color: '#f0c24b',
    ambient: 'ごみ、いっぱい落ちてるね。',
    lines: [
      'ここ、夕方になるとごみだらけになるんだよ。',
      'カラスがつついて、もっと散らかるの。',
      'ごみって、どこに行くのかなあ？',
    ],
  },
  {
    id: 'robot-cleaner',
    type: 'robot',
    zone: 'market',
    position: [30, 47],
    wander: 6,
    color: '#a9b9cc',
    ambient: 'ごみを見つけました。回収しますね。',
    lines: [
      'わたしは清掃ロボットです。一日に集めるごみは、およそ300キロになります。',
      'ごみは減りません。だから、わたしの仕事も終わらないんです。',
      'あなたが拾ってくれたごみも、ちゃんと見ていましたよ。',
    ],
  },
];

export const NPCS: NpcDef[] = ALL_NPCS.slice(0, MAX_NPCS);

export const NPC_MAP: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));
