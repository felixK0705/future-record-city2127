// プレイ中の常時表示：残り時間とミニマップだけ。
// 行動の数値やスコアは一切表示しない。

import { useGame } from '../game/store';
import styles from './Hud.module.css';
import { Minimap } from './Minimap';
import { TouchControls } from './TouchControls';
import { useIsTouch } from './useIsTouch';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Hud() {
  const remaining = useGame((s) => s.remaining);
  const focus = useGame((s) => s.focus);
  const riding = useGame((s) => s.riding);
  const panel = useGame((s) => s.panel);
  const touch = useIsTouch();
  const late = remaining <= 30;

  return (
    <div className={styles.hud}>
      <div className={styles.topLeft}>
        <div className={`${styles.clock} ${late ? styles.late : ''}`}>
          <span className={styles.clockLabel}>日暮れまで</span>
          <span className={styles.clockTime}>{formatTime(remaining)}</span>
        </div>
      </div>
      <div className={styles.topRight}>
        <Minimap />
      </div>

      {!touch && focus && !riding && !panel && (
        <div className={styles.prompt}>
          <kbd className={styles.key}>E</kbd>
          <span>{focus.label}</span>
        </div>
      )}

      {touch && <TouchControls label={riding || panel ? null : (focus?.label ?? null)} />}
    </div>
  );
}
