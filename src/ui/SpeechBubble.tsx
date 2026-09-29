// NPC の頭上に浮かぶ吹き出し（3D 空間内の Html として描画される）

import styles from './SpeechBubble.module.css';

interface Props {
  text: string;
  /** 話しかけたときの台詞（強調表示） */
  active?: boolean;
  /** ロボットの台詞 */
  robot?: boolean;
}

export function SpeechBubble({ text, active = false, robot = false }: Props) {
  const cls = [styles.bubble, active ? styles.active : styles.ambient, robot ? styles.robot : ''].join(' ');
  return (
    <div className={cls}>
      <p className={styles.text}>{text}</p>
    </div>
  );
}
