// スマートフォン用の操作：左下の仮想スティックと右下の操作ボタン

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { runtime } from '../game/runtime';
import styles from './TouchControls.module.css';

const RADIUS = 56;

interface Props {
  /** 操作できる対象があるときのラベル */
  label: string | null;
}

export function TouchControls({ label }: Props) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const update = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    runtime.input.joyX = dx / RADIUS;
    runtime.input.joyY = -dy / RADIUS;
    runtime.input.joyActive = true;
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const release = () => {
    pointer.current = null;
    runtime.input.joyX = 0;
    runtime.input.joyY = 0;
    runtime.input.joyActive = false;
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
    setActive(false);
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (pointer.current !== null) return;
    pointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    update(e.clientX, e.clientY);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (pointer.current === e.pointerId) update(e.clientX, e.clientY);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (pointer.current === e.pointerId) release();
  };

  return (
    <>
      <div
        ref={base}
        className={`${styles.stick} ${active ? styles.stickActive : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div ref={knob} className={styles.knob} />
      </div>
      <button
        type="button"
        className={`${styles.action} ${label ? styles.actionReady : ''}`}
        disabled={!label}
        onPointerDown={(e) => {
          e.stopPropagation();
          runtime.input.interactQueued = true;
        }}
      >
        {label ?? '・'}
      </button>
    </>
  );
}
