// Original meme cards with a drawn tooth character. node scripts/tgmeme.mjs meme.json out.jpg
// layouts:
//  {"layout":"classic","top":"...","bottom":"...","mood":"cry","prop":"brush","bg":"#..."}
//  {"layout":"panels","title":"...","rows":[{"mood":"scared","prop":"","text":"..."},{"mood":"happy","prop":"brush","text":"..."}]}
//  {"layout":"nobody","lines":["Hech kim:","Aql tishi 17 yoshda:"],"mood":"smug","prop":"","bubble":"Salom, men keldim"}
// moods: happy scared smug cry shocked wise guilty sleepy angry ; props: brush candy crown sparkle zzz sweat ""
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [, , inFile, outFile] = process.argv;
const m = JSON.parse(readFileSync(inFile, 'utf8'));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const font = (w) => 'data:font/woff2;base64,' + readFileSync(`${root}/node_modules/@fontsource/host-grotesk/files/host-grotesk-latin-${w}-normal.woff2`).toString('base64');
const esc = (s = '') => String(s).replace(/[&<>]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[x]));
const INK = '#1d2327';
function face(mood) {
  const eyeL = 72, eyeR = 128, ey = 92;
  const round = (r = 13, p = 5, dx = 0, dy = 0) => `<circle cx="${eyeL}" cy="${ey}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="${eyeR}" cy="${ey}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="${eyeL + dx}" cy="${ey + dy}" r="${p}" fill="${INK}"/><circle cx="${eyeR + dx}" cy="${ey + dy}" r="${p}" fill="${INK}"/>`;
  const arcs = `<path d="M${eyeL - 11} ${ey + 4} q11 -14 22 0M${eyeR - 11} ${ey + 4} q11 -14 22 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  const closed = `<path d="M${eyeL - 12} ${ey} h24M${eyeR - 12} ${ey} h24" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  const blush = `<ellipse cx="55" cy="118" rx="11" ry="6" fill="#ff9aa8" opacity=".7"/><ellipse cx="145" cy="118" rx="11" ry="6" fill="#ff9aa8" opacity=".7"/>`;
  switch (mood) {
    case 'happy': return arcs + blush + `<path d="M78 122 q22 26 44 0" fill="#c4384f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    case 'scared': return round(15, 4, 0, 2) + `<path d="M80 132 q5 -8 10 0 q5 8 10 0 q5 -8 10 0 q5 8 10 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M160 60 q8 14 0 20 q-8 -6 0 -20z" fill="#7cc7ff" stroke="${INK}" stroke-width="3"/>`;
    case 'smug': return `<path d="M46 80 h48 v18 q-4 12 -24 12 q-20 0 -24 -12z M106 80 h48 v18 q-4 12 -24 12 q-20 0 -24 -12z" fill="${INK}"/><path d="M94 86 h12" stroke="${INK}" stroke-width="5"/><path d="M84 128 q20 8 36 -6" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    case 'cry': return closed + `<path d="M${eyeL - 6} ${ey + 6} v40M${eyeR + 6} ${ey + 6} v40" stroke="#5cb8ff" stroke-width="9" stroke-linecap="round" opacity=".9"/><path d="M80 136 q20 -18 40 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    case 'shocked': return round(17, 5) + `<ellipse cx="100" cy="134" rx="13" ry="16" fill="#c4384f" stroke="${INK}" stroke-width="5"/>`;
    case 'wise': return `<circle cx="${eyeL}" cy="${ey}" r="17" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="${eyeR}" cy="${ey}" r="17" fill="none" stroke="${INK}" stroke-width="5"/><path d="M89 ${ey} h22" stroke="${INK}" stroke-width="5"/>` + arcs + `<path d="M84 124 q16 12 32 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    case 'guilty': return round(12, 5, 6, -2) + `<path d="M80 128 l8 -6 8 6 8 -6 8 6 8 -6" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M162 58 q8 14 0 20 q-8 -6 0 -20z" fill="#7cc7ff" stroke="${INK}" stroke-width="3"/>` + blush;
    case 'sleepy': return closed + `<ellipse cx="100" cy="130" rx="8" ry="6" fill="${INK}"/>`;
    case 'angry': return round(11, 5) + `<path d="M56 70 l30 12M144 70 l-30 12" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M80 136 q20 -14 40 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    default: return arcs + `<path d="M84 124 q16 12 32 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  }
}
function prop(p) {
  switch (p) {
    case 'brush': return `<g transform="translate(176 120) rotate(-35)"><rect x="0" y="-7" width="92" height="14" rx="7" fill="#4aa3ff" stroke="${INK}" stroke-width="4"/><rect x="62" y="-24" width="30" height="17" rx="3" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M68 -24 v-8M76 -24 v-8M84 -24 v-8" stroke="${INK}" stroke-width="3"/></g>`;
    case 'candy': return `<g transform="translate(182 110)"><path d="M0 18 l46 -40" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><circle cx="56" cy="-30" r="28" fill="#ff6fae" stroke="${INK}" stroke-width="5"/><path d="M56 -30 m-16 0 a16 16 0 1 0 16 -16 a10 10 0 1 1 -8 10" fill="none" stroke="#fff" stroke-width="5"/></g>`;
    case 'crown': return `<path d="M58 6 l12 -30 18 22 12 -30 12 30 18 -22 12 30z" fill="#ffd23f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    case 'sparkle': return `<g fill="#ffd23f" stroke="${INK}" stroke-width="3"><path d="M-30 40 l6 -16 6 16 16 6 -16 6 -6 16 -6 -16 -16 -6z"/><path d="M220 20 l5 -12 5 12 12 5 -12 5 -5 12 -5 -12 -12 -5z"/><path d="M226 160 l4 -10 4 10 10 4 -10 4 -4 10 -4 -10 -10 -4z"/></g>`;
    case 'zzz': return `<text x="170" y="40" font-family="H" font-weight="700" font-size="44" fill="${INK}">Z<tspan font-size="32" dy="-24">z</tspan><tspan font-size="24" dy="-18">z</tspan></text>`;
    default: return '';
  }
}
const arms = `<path d="M22 118 q-24 10 -18 40M178 118 q24 10 18 40" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
const tooth = (mood, p, size = 420) => `<svg viewBox="-40 -40 300 300" width="${size}" height="${size}" style="overflow:visible"><path d="M100 18c-22-14-58-14-72 12-14 26-6 60 6 86 8 18 10 40 14 62 3 18 9 34 20 34 13 0 15-22 18-42 3-20 6-30 14-30s11 10 14 30c3 20 5 42 18 42 11 0 17-16 20-34 4-22 6-44 14-62 12-26 20-60 6-86-14-26-50-26-72-12z" fill="#fff" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>${arms}${face(mood)}${prop(p)}</svg>`;
const brand = m.brand || '@Alimbaevs_stom';
let body = '';
if (m.layout === 'panels') {
  body = `<div class="pt">${esc(m.title || '')}</div>` + m.rows.map((r, i) => `<div class="row r${i}"><div class="pc">${tooth(r.mood, r.prop, 380)}</div><div class="px">${esc(r.text)}</div></div>`).join('');
} else if (m.layout === 'nobody') {
  body = `<div class="nb">${m.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div><div class="nbc">${m.bubble ? `<div class="bub">${esc(m.bubble)}</div>` : ''}${tooth(m.mood, m.prop, 520)}</div>`;
} else {
  body = `<div class="cl top">${esc(m.top || '')}</div><div class="clc">${tooth(m.mood, m.prop, 600)}</div><div class="cl bot">${esc(m.bottom || '')}</div>`;
}
const bg = m.bg || (m.layout === 'classic' ? '#7fd0c4' : '#ffffff');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:H;src:url(${font(500)});font-weight:500}@font-face{font-family:H;src:url(${font(700)});font-weight:700}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1350px;background:${bg};font-family:H,sans-serif;color:${INK};position:relative;overflow:hidden}
.cl{position:absolute;left:50px;right:50px;text-align:center;font-weight:700;font-size:82px;line-height:1.02;text-transform:uppercase;color:#fff;-webkit-text-stroke:7px ${INK};paint-order:stroke fill;letter-spacing:-.01em}
.top{top:60px}.bot{bottom:90px}.clc{position:absolute;left:0;right:0;top:300px;display:flex;justify-content:center}
.pt{height:150px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:58px;text-align:center;padding:0 50px;border-bottom:6px solid ${INK}}
.row{height:575px;display:flex;align-items:center;border-bottom:6px solid ${INK}}.row:last-of-type{border-bottom:0}
.r0{background:#ffe1e5}.r1{background:#dcf5e7}.pc{width:470px;display:flex;justify-content:center}.px{flex:1;padding:0 50px 0 10px;font-weight:700;font-size:60px;line-height:1.1}
.nb{padding:90px 80px 0;font-size:66px;font-weight:500;line-height:1.25}.nb p:first-child{color:#6b7376}
.nbc{position:absolute;left:0;right:0;bottom:120px;display:flex;flex-direction:column;align-items:center}
.bub{position:relative;margin-bottom:10px;background:#fff;border:6px solid ${INK};border-radius:40px;padding:22px 40px;font-size:54px;font-weight:700;max-width:860px;text-align:center}
.bub:after{content:"";position:absolute;left:50%;bottom:-34px;width:40px;height:40px;background:#fff;border-right:6px solid ${INK};border-bottom:6px solid ${INK};transform:translateX(-50%) rotate(45deg)}
.brand{position:absolute;right:40px;bottom:28px;font-size:30px;font-weight:700;background:${INK};color:#fff;padding:8px 18px;border-radius:999px}
</style></head><body>${body}<div class="brand">${esc(brand)}</div></body></html>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: outFile, type: 'jpeg', quality: 88 }); await b.close(); console.log('ok', outFile);
