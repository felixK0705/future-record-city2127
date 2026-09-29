// ミニマップ：区域・建物・時計塔・ポッド乗り場と自分の位置だけを表示する

import { useEffect, useRef } from 'react';
import { WORLD_HALF, ZONES } from '../data/zones';
import { BUILDINGS, CLOCK_TOWER, STATIONS } from '../game/cityData';
import { runtime } from '../game/runtime';
import styles from './Minimap.module.css';

const SIZE = 150;

function drawStatic(ctx: CanvasRenderingContext2D, scale: number) {
  const toPx = (v: number) => (v + WORLD_HALF) * scale;
  ctx.fillStyle = '#6f7a66';
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (const z of ZONES) {
    const [x0, z0, x1, z1] = z.rect;
    ctx.fillStyle = z.mapColor;
    ctx.fillRect(toPx(x0), toPx(z0), (x1 - x0) * scale, (z1 - z0) * scale);
  }
  ctx.fillStyle = 'rgba(40, 42, 52, 0.75)';
  for (const b of BUILDINGS) {
    ctx.fillRect(toPx(b.x - b.w / 2), toPx(b.z - b.d / 2), b.w * scale, b.d * scale);
  }
  ctx.fillStyle = '#fff1c9';
  ctx.beginPath();
  ctx.arc(toPx(CLOCK_TOWER.x), toPx(CLOCK_TOWER.z), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8fe6ff';
  for (const s of STATIONS) {
    ctx.beginPath();
    ctx.arc(toPx(s.x), toPx(s.z), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = '600 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (const z of ZONES) {
    const [x0, z0, x1, z1] = z.rect;
    const cy = z.id === 'plaza' ? toPx(z1) - 6 : toPx((z0 + z1) / 2);
    ctx.fillText(z.name, toPx((x0 + x1) / 2), cy);
  }
}

export function Minimap() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = SIZE * dpr;
    c.height = SIZE * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const scale = SIZE / (WORLD_HALF * 2);

    // 静的な部分は一度だけ描いておく
    const base = document.createElement('canvas');
    base.width = SIZE * dpr;
    base.height = SIZE * dpr;
    const bctx = base.getContext('2d');
    if (!bctx) return;
    bctx.scale(dpr, dpr);
    drawStatic(bctx, scale);

    let raf = 0;
    const loop = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(base, 0, 0);
      ctx.scale(dpr, dpr);
      const p = runtime.player;
      const x = (p.x + WORLD_HALF) * scale;
      const y = (p.z + WORLD_HALF) * scale;
      ctx.translate(x, y);
      ctx.rotate(-p.heading + Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1b1f2a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 4.5);
      ctx.lineTo(0, 2);
      ctx.lineTo(-4.5, 4.5);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvas} className={styles.map} aria-label="ミニマップ" />;
}
