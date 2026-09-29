// エントリーポイント

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './ui/App';

// 開発モードでは起動時に結末の分布をコンソールへ出力する
if (import.meta.env.DEV) {
  void import('./data/simulate').then((m) => m.runSimulation());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
