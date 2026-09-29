// 時間跳躍の演出：2027 → 2127

import { useEffect, useRef, useState } from 'react';
import { TIMELEAP_MS } from '../game/constants';
import { useGame } from '../game/store';
import styles from './TimeLeap.module.css';

const FROM = 2027;
const TO = 2127;

export function TimeLeap() {
  const [year, setYear] = useState(FROM);
  const [flash, setFlash] = useState(false);
  const setFuture = useGame((s) => s.setFuture);
  const showEnding = useGame((s) => s.showEnding);
  const switched = useRef(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / TIMELEAP_MS);
      // ゆっくり始まり、途中で一気に進み、最後に静かに止まる
      const count = Math.min(1, Math.max(0, (t - 0.15) / 0.55));
      const eased = count < 0.5 ? 4 * count ** 3 : 1 - (-2 * count + 2) ** 3 / 2;
      setYear(Math.round(FROM + (TO - FROM) * eased));
      if (t > 0.62 && !switched.current) {
        switched.current = true;
        setFlash(true);
        setFuture(true);
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else showEnding();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setFuture, showEnding]);

  return (
    <div className={styles.screen}>
      <div className={styles.streaks} />
      <div className={styles.center}>
        <p className={styles.caption}>{year < TO ? '時が流れていく' : '100年後'}</p>
        <p className={styles.year}>{year}</p>
      </div>
      {flash && <div className={styles.flash} />}
    </div>
  );
}
