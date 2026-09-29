// 調整可能なゲーム定数

/** 探索の制限時間（秒） */
export const GAME_DURATION_SEC = 240;

/** 歩く速さ（m/秒） */
export const WALK_SPEED = 5;
/** 走る速さ（m/秒） */
export const RUN_SPEED = 9.5;
/** プレイヤーの当たり判定半径 */
export const PLAYER_RADIUS = 0.5;

/** 話しかけたり拾ったりできる距離 */
export const INTERACT_RADIUS = 2.8;
/** ごみの「そばを通った」とみなす半径 */
export const LITTER_PASS_RADIUS = 2.5;
/** この距離まで離れたら「拾わずに通り過ぎた」と記録する */
export const LITTER_LEAVE_RADIUS = 4.5;

/** 行動ログを zustand に同期する間隔（秒） */
export const SYNC_INTERVAL_SEC = 1;

/** 立ち止まっているとみなす速さ */
export const IDLE_SPEED = 0.2;

/** ポッドの乗車時間（秒） */
export const POD_RIDE_SEC = 5;

/** 吹き出しが消えるまでの時間（ミリ秒） */
export const DIALOG_MS = 4200;

/** 時間跳躍の演出時間（ミリ秒） */
export const TIMELEAP_MS = 6500;

/** 近づくとひとことを話す距離 */
export const NPC_AMBIENT_RADIUS = 9;
