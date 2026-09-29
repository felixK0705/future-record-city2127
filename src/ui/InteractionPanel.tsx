// AI端末と時計塔のパネル

import { callableTroubles } from '../game/helping';
import { askTerminal, callHelpFromTerminal, callPodFromTerminal } from '../game/interaction';
import { useGame } from '../game/store';
import styles from './InteractionPanel.module.css';

export function InteractionPanel() {
  const panel = useGame((s) => s.panel);
  const closePanel = useGame((s) => s.closePanel);
  const endGame = useGame((s) => s.endGame);

  if (!panel) return null;

  if (panel.kind === 'tower') {
    return (
      <div className={styles.panel} role="dialog" aria-label="時計塔">
        <p className={styles.caption}>時計塔</p>
        <p className={styles.body}>鐘を鳴らすと、この一日が終わります。</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={endGame}>
            鐘を鳴らす
          </button>
          <button type="button" className={styles.secondary} onClick={closePanel}>
            まだ歩く
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${styles.terminal}`} role="dialog" aria-label="AI端末">
      <p className={styles.caption}>AI端末</p>
      <p key={panel.answer ?? 'greet'} className={styles.body}>
        {panel.answer ?? 'こんにちは。ご用件をどうぞ。'}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => askTerminal(panel.id)}>
          この辺りについて聞く
        </button>
        {callableTroubles().map((t) => (
          <button key={t.id} type="button" className={styles.primary} onClick={() => callHelpFromTerminal(panel.id, t.id)}>
            {t.label}
          </button>
        ))}
        <button type="button" className={styles.primary} onClick={() => callPodFromTerminal(panel.id)}>
          ポッドで移動する
        </button>
        <button type="button" className={styles.secondary} onClick={closePanel}>
          閉じる
        </button>
      </div>
    </div>
  );
}
