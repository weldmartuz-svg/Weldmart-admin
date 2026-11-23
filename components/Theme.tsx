'use client';
import I from './Icon';
export default function Theme() {
  return <button type="button" className="btn btn-q icon-btn" aria-label="Kunduzgi yoki tungi rejim" onClick={() => { const r = document.documentElement; const n = r.dataset.theme === 'light' ? 'dark' : 'light'; r.dataset.theme = n; try { localStorage.setItem('t', n); } catch {} }}><I n="moon" s={17} /></button>;
}
