// 結末画面：100年後の街の姿を見せる

import { ENDING_MAP } from '../data/endings';
import { useGame } from '../game/store';
import styles from './EndingScreen.module.css';

export function EndingScreen() {
  const result = useGame((s) => s.result);
  const showReveal = useGame((s) => s.showReveal);
  if (!result) return null;
  const ending = ENDING_MAP[result.endingId];

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.year}>2127年</p>
        <h2 className={styles.name}>{ending.name}</h2>
        <p className={styles.tagline}>{ending.tagline}</p>
      </header>

      <section className={styles.card}>
        <p className={styles.text}>{ending.description}</p>
        <div className={styles.object}>
          <span className={styles.objectLabel}>この街にあるもの</span>
          <span className={styles.objectName}>{ending.futureObjectName}</span>
        </div>
        <div className={styles.cost}>
          <span className={styles.costLabel}>代償</span>
          <p className={styles.costText}>{ending.cost}</p>
        </div>
        <button type="button" className={styles.next} onClick={showReveal}>
          あなたの足あと
        </button>
      </section>
    </div>
  );
}
