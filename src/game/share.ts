// 共有 URL：結末と上位3つの行動をクエリに埋め込み、開くと「あなたの足あと」を再現する。

import { isBehaviorId, type BehaviorId } from '../data/behaviors';
import { isEndingId } from '../data/endings';
import type { GameResult } from './store';

export function buildShareUrl(result: GameResult): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('e', result.endingId);
  url.searchParams.set('b', result.topBehaviors.join(','));
  return url.toString();
}

export function parseShareUrl(search: string): GameResult | null {
  const params = new URLSearchParams(search);
  const e = params.get('e');
  const b = params.get('b');
  if (!e || !b || !isEndingId(e)) return null;
  const behaviors = b
    .split(',')
    .filter((id): id is BehaviorId => isBehaviorId(id))
    .slice(0, 3);
  if (behaviors.length === 0) return null;
  return { endingId: e, topBehaviors: behaviors };
}

/** クエリを消してタイトルから遊び直す */
export function restartWithoutQuery(): void {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  window.location.href = url.toString();
}
