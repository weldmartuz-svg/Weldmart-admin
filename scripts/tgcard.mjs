// Telegram post kartochkasi: node scripts/tgcard.mjs card.json out.png
// card.json: { "kind": "Fakt|Tarix|Yumor|Statistika|Maslahat", "title": "...", "big": "1938", "note": "...", "brand": "Alimbaev Stom" }
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [, , inFile, outFile] = process.argv;
const c = JSON.parse(readFileSync(inFile, 'utf8'));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const font = (w) => 'data:font/woff2;base64,' + readFileSync(`${root}/node_modules/@fontsource/host-grotesk/files/host-grotesk-latin-${w}-normal.woff2`).toString('base64');
const PAL = {
  Fakt: ['#0e6e6a', '#e6f4f1'], Tarix: ['#8a5a1f', '#f6eee2'], Yumor: ['#b4364f', '#fbecef'], Statistika: ['#2f4fa8', '#eaf0fb'], Maslahat: ['#2f7d3c', '#eaf5ec'],
};
const [ink, paper] = PAL[c.kind] || PAL.Fakt;
const esc = (s = '') => String(s).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const tooth = `<svg viewBox="0 0 200 220" width="300" height="330" aria-hidden="true"><path d="M100 18c-22-14-58-14-72 12-14 26-6 60 6 86 8 18 10 40 14 62 3 18 9 34 20 34 13 0 15-22 18-42 3-20 6-30 14-30s11 10 14 30c3 20 5 42 18 42 11 0 17-16 20-34 4-22 6-44 14-62 12-26 20-60 6-86-14-26-50-26-72-12z" fill="#fff" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/><path d="M62 52c10-10 26-12 38-4" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" opacity=".35"/></svg>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:H;src:url(${font(400)});font-weight:400}@font-face{font-family:H;src:url(${font(500)});font-weight:500}@font-face{font-family:H;src:url(${font(700)});font-weight:700}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1350px;background:${paper};font-family:H,sans-serif;color:#17201f;position:relative;overflow:hidden}
.top{position:absolute;left:84px;right:84px;top:76px;display:flex;justify-content:space-between;align-items:center;font-size:30px;font-weight:500}
.kind{color:#fff;background:${ink};padding:10px 26px;border-radius:999px}
.brand{color:${ink}}
h1{font-size:84px;line-height:1.04;font-weight:700;letter-spacing:-.025em;color:#17201f}
.main{position:absolute;left:84px;right:84px;top:200px;display:flex;flex-direction:column}
.main h1{position:static}
.big{margin-top:110px;font-size:${(c.big || '').length > 6 ? 150 : 190}px;font-weight:700;letter-spacing:-.04em;line-height:1;color:${ink};max-width:620px}
.note{margin-top:36px;max-width:560px;font-size:40px;line-height:1.3;color:#2b3634}
.art{position:absolute;right:70px;bottom:90px}
.bar{position:absolute;left:0;right:0;bottom:0;height:22px;background:${ink}}
</style></head><body><div class="top"><span class="kind">${esc(c.kind)}</span><span class="brand">${esc(c.brand || 'Alimbaev Stom')}</span></div>
<div class="main"><h1>${esc(c.title)}</h1>${c.big ? `<div class="big">${esc(c.big)}</div>` : ''}<p class="note">${esc(c.note || '')}</p></div><div class="art">${tooth}</div><div class="bar"></div></body></html>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: outFile, type: 'jpeg', quality: 88 }); await b.close(); console.log('ok', outFile);
