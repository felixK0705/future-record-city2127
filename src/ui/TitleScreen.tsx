// タイトル画面：一日の過ごし方と操作方法だけを伝える

import { useGame } from '../game/store';
import styles from './TitleScreen.module.css';
import { useIsTouch } from './useIsTouch';

export function TitleScreen() {
  const startGame = useGame((s) => s.startGame);
  const touch = useIsTouch();

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <p className={styles.year}>2027</p>
        <h1 className={styles.title}>100年後の街</h1>
        <p className={styles.lead}>この街で、あなたの一日を過ごしてください</p>

        <div className={styles.controls}>
          {touch ? (
            <dl className={styles.list}>
              <dt>左下のスティック</dt>
              <dd>歩く（倒しきると走る）</dd>
              <dt>画面をなぞる</dt>
              <dd>見回す</dd>
              <dt>右下のボタン</dt>
              <dd>話す・拾う・乗る・使う</dd>
            </dl>
          ) : (
            <dl className={styles.list}>
              <dt>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> / 矢印キー
              </dt>
              <dd>歩く</dd>
              <dt>
                <kbd>Shift</kbd>
              </dt>
              <dd>走る</dd>
              <dt>マウスでドラッグ</dt>
              <dd>見回す</dd>
              <dt>
                <kbd>E</kbd>
              </dt>
              <dd>話す・拾う・乗る・使う</dd>
            </dl>
          )}
        </div>

        <button type="button" className={styles.start} onClick={startGame}>
          街へ出る
        </button>
      </div>
    </div>
  );
}
