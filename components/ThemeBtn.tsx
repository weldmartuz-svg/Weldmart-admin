'use client';
import I from './Icon';
export default function ThemeBtn() {
  return <button className="ib" title="Kunduzgi / tungi rejim" onClick={() => { const r = document.documentElement; const n = r.dataset.theme === 'light' ? 'dark' : 'light'; r.dataset.theme = n; try { localStorage.setItem('t', n); } catch {} }}><I n="moon" s={16} /></button>;
}
