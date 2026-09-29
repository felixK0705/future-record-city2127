// 「あなたの足あと」：影響の大きかった3つの行動と、それがつながった未来の物

import { useMemo, useState } from 'react';
import { BEHAVIOR_MAP } from '../data/behaviors';
import { ENDING_MAP } from '../data/endings';
import { buildShareUrl, restartWithoutQuery } from '../game/share';
import { useGame } from '../game/store';
import styles from './RevealScreen.module.css';

export function RevealScreen() {
  const result = useGame((s) => s.result);
  const fromShare = useGame((s) => s.fromShare);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const shareUrl = useMemo(() => (result ? buildShareUrl(result) : ''), [result]);

  if (!result) return null;
  const ending = ENDING_MAP[result.endingId];

  const share = async () => {
    const text = `わたしの一日から生まれた100年後の街は「${ending.name}」でした。`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '100年後の街', text, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied('copied');
    } catch (err) {
      // 共有シートを閉じただけのときは何もしない
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setCopied('failed');
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.kicker}>{fromShare ? '誰かが歩いた一日から生まれた未来' : 'あなたの行動が、この未来をつくりました'}</p>
          <h2 className={styles.title}>{fromShare ? 'その人の足あと' : 'あなたの足あと'}</h2>
          <p className={styles.ending}>
            2127年 ・ <strong>{ending.name}</strong>
          </p>
        </header>

        <ol className={styles.list}>
          {result.topBehaviors.map((id) => {
            const b = BEHAVIOR_MAP[id];
            return (
              <li key={id} className={styles.item}>
                <div className={styles.link}>
                  <span className={styles.behavior}>{b.name}</span>
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
                  <span className={styles.future}>{b.futureObject.name}</span>
                </div>
                <p className={styles.text}>{b.revealText}</p>
              </li>
            );
          })}
        </ol>

        <p className={styles.note}>どの行動にも、正解も不正解もありません。どの一日も、どこかの未来につながっています。</p>

        <div className={styles.actions}>
          {!fromShare && (
            <button type="button" className={styles.primary} onClick={share}>
              この未来を共有する
            </button>
          )}
          <button type="button" className={fromShare ? styles.primary : styles.secondary} onClick={restartWithoutQuery}>
            {fromShare ? 'あなたもこの街を歩いてみる' : 'もう一度、この街を歩く'}
          </button>
        </div>

        {!fromShare && (
          <div className={styles.shareBox}>
            <input className={styles.url} readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} aria-label="共有用URL" />
            {copied === 'copied' && <p className={styles.status}>URLをコピーしました</p>}
            {copied === 'failed' && <p className={styles.status}>URLを長押しまたは選択してコピーしてください</p>}
          </div>
        )}
      </div>
    </div>
  );
}
