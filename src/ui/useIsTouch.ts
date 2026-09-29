// タッチ操作の端末かどうかを判定する

import { useEffect, useState } from 'react';

const query = '(pointer: coarse)';

export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setTouch(mq.matches);
    mq.addEventListener('change', onChange);
    // 最初のタッチで確定させる（ハイブリッド端末向け）
    const onTouch = () => setTouch(true);
    window.addEventListener('touchstart', onTouch, { once: true });
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('touchstart', onTouch);
    };
  }, []);
  return touch;
}
