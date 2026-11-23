export const TZ = 'Asia/Tashkent';
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
export const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso));
export const addDays = (s: string, n: number) => { const t = new Date(s + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const span = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
const isD = (s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export function range(sp: any, def = '30') {
  const t = today(); let d = sp?.d || def, since = t, until = t;
  if (isD(sp?.from) && isD(sp?.to)) { [since, until] = [sp.from, sp.to].sort(); d = 'custom'; }
  else if (d === 'today') { }
  else if (d === 'yest') { since = until = addDays(t, -1); }
  else if (d === 'mtd') { since = t.slice(0, 8) + '01'; }
  else { const n = Math.min(Math.max(Number(d) || Number(def), 1), 730); since = addDays(t, -(n - 1)); d = String(n); }
  const len = span(since, until);
  return { d, since, until, len, pSince: addDays(since, -len), pUntil: addDays(since, -1) };
}
export const money = (v: number) => (v >= 1000 ? '$' + Math.round(v).toLocaleString('en-US') : '$' + (Math.round(v * 100) / 100).toFixed(v >= 100 ? 0 : 2));
export const num = (v: number) => Math.round(v || 0).toLocaleString('ru-RU');
export const dt = (d?: string | null) => d ? new Date(d).toLocaleString('ru-RU', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—';
export const hm = (d: string) => new Date(d).toLocaleTimeString('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const avatarColor = (s: string) => { let h = 0; for (const c of s || '') h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 52% 46%)`; };
export const q = (s: string) => encodeURIComponent(s);
