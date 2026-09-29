// 街の5つの区域。それぞれが現代の課題をひとつ静かに抱えている。

export type ZoneId = 'residential' | 'shotengai' | 'plaza' | 'avenue' | 'market';

export interface ZoneDef {
  id: ZoneId;
  /** 画面に出す区域名（ミニマップ用） */
  name: string;
  /** 区域が抱える課題（コード上の説明用。プレイ中には表示しない） */
  issue: string;
  /** 矩形範囲 [minX, minZ, maxX, maxZ] */
  rect: [number, number, number, number];
  /** 地面の色 */
  groundColor: string;
  /** ミニマップ上の色 */
  mapColor: string;
  /** AI端末に「この街について聞く」と答える内容 */
  aiInfo: string[];
}

export const WORLD_HALF = 62;

export const ZONES: ZoneDef[] = [
  {
    id: 'residential',
    name: '住宅街',
    issue: '空き家の増加',
    rect: [-60, -60, -18, 18],
    groundColor: '#b9c29a',
    mapColor: '#8fa872',
    aiInfo: [
      'この住宅街の住宅のうち、およそ3軒に1軒には今、誰も住んでいません。',
      '空き家の多くは、持ち主が遠くに住んでいたり、相続した人が決めかねていたりします。',
      '近所のベンチには、毎日同じ時間に座る方がいるそうです。',
    ],
  },
  {
    id: 'shotengai',
    name: '商店街',
    issue: '高齢者の孤立',
    rect: [18, -60, 60, 18],
    groundColor: '#cbb89c',
    mapColor: '#c2a174',
    aiInfo: [
      '商店街の店主の平均年齢は70歳を超えています。シャッターを下ろしたままの店も増えました。',
      'この辺りでは、一日誰とも会話しない高齢の方も少なくありません。',
      '昔はここで、毎晩のように立ち話が続いていたそうです。',
    ],
  },
  {
    id: 'plaza',
    name: '中央広場',
    issue: 'ヒートアイランド',
    rect: [-18, -18, 18, 18],
    groundColor: '#e3d2bb',
    mapColor: '#e0c9a6',
    aiInfo: [
      '現在の広場の地表温度は52℃。木陰との温度差は15℃以上あります。',
      '広場の舗装が熱をため込み、夜になっても気温が下がりにくくなっています。',
      '中央の時計塔は、この街ができた頃からずっと時を刻んでいます。',
    ],
  },
  {
    id: 'avenue',
    name: '大通り',
    issue: '交通渋滞',
    rect: [-62, 18, 62, 34],
    groundColor: '#4a4d57',
    mapColor: '#5d606b',
    aiInfo: [
      '大通りは現在、約2.4kmの渋滞。通過には平常時の4倍の時間がかかります。',
      '自動運転ポッドは渋滞を避けて、歩道側の専用レーンを走ります。',
      '車の約7割は、一人しか乗っていません。',
    ],
  },
  {
    id: 'market',
    name: '市場',
    issue: '食品ロスとごみ',
    rect: [-62, 34, 62, 62],
    groundColor: '#c49d86',
    mapColor: '#b98a74',
    aiInfo: [
      'この市場では毎日、まだ食べられる食材がたくさん捨てられています。',
      '夕方になると売れ残りが増え、通りにはごみが目立ち始めます。',
      '形が悪いだけの野菜は、値段がつかないこともあります。',
    ],
  },
];

export const ZONE_MAP: Record<ZoneId, ZoneDef> = Object.fromEntries(
  ZONES.map((z) => [z.id, z]),
) as Record<ZoneId, ZoneDef>;

/** 座標がどの区域にあるかを返す（どこにも属さない通りは null） */
export function zoneAt(x: number, z: number): ZoneId | null {
  for (const zone of ZONES) {
    const [x0, z0, x1, z1] = zone.rect;
    if (x >= x0 && x < x1 && z >= z0 && z < z1) return zone.id;
  }
  return null;
}

export function zoneCenter(id: ZoneId): [number, number] {
  const [x0, z0, x1, z1] = ZONE_MAP[id].rect;
  return [(x0 + x1) / 2, (z0 + z1) / 2];
}
