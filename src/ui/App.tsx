// 画面の切り替え：タイトル → 探索 → 時間跳躍 → 結末 → あなたの足あと

import { useEffect } from 'react';
import { parseShareUrl } from '../game/share';
import { useGame } from '../game/store';
import { World } from '../scene/World';
import styles from './App.module.css';
import { EndingScreen } from './EndingScreen';
import { Hud } from './Hud';
import { InteractionPanel } from './InteractionPanel';
import { RevealScreen } from './RevealScreen';
import { TimeLeap } from './TimeLeap';
import { TitleScreen } from './TitleScreen';

export function App() {
  const phase = useGame((s) => s.phase);
  const loadShared = useGame((s) => s.loadShared);

  // 共有 URL で開かれたときは「あなたの足あと」を直接表示する
  useEffect(() => {
    const shared = parseShareUrl(window.location.search);
    if (shared) loadShared(shared);
  }, [loadShared]);

  return (
    <main className={styles.app}>
      <World />
      {phase === 'title' && <TitleScreen />}
      {phase === 'playing' && (
        <>
          <Hud />
          <InteractionPanel />
        </>
      )}
      {phase === 'timeleap' && <TimeLeap />}
      {phase === 'ending' && <EndingScreen />}
      {phase === 'reveal' && <RevealScreen />}
    </main>
  );
}
