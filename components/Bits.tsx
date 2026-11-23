import Link from 'next/link';
import I from './Icon';
export function Stat({ label, v, sub, cur, prev, f, good }: any) {
  let d: any = null;
  if (good && prev !== undefined) {
    if (prev > 0) { const p = Math.round(((cur - prev) / prev) * 100), up = p >= 0; const cls = good === 'none' ? 'mut' : (good === 'up') === up ? 'g' : 'r'; d = <small className={cls}>{up ? '▲' : '▼'} {Math.abs(p)}% <span>avvalgi: {f(prev)}</span></small>; }
    else d = <small className="mut">avvalgi davrda ma'lumot yo'q</small>;
  }
  return <div className="st"><span>{label}</span><b>{v}</b>{d}{sub && <small className="mut">{sub}</small>}</div>;
}
export function RangeBar({ r, presets }: { r: any; presets: string[][] }) {
  return <div className="rb">{presets.map(([k, l]) => <a key={k} href={`?d=${k}`} className={r.d === k ? 'on' : ''}>{l}</a>)}
    <form method="get"><input type="date" name="from" defaultValue={r.since} /><span className="mut">→</span><input type="date" name="to" defaultValue={r.until} /><button className="btn sm">Ko'rsat</button></form></div>;
}
export function ProjectBar({ p }: { p: any }) {
  const chip = (ok: boolean, l: string) => <span className={'chip' + (ok ? ' ok' : '')}>{ok ? <I n="check" s={12} /> : <i className="dot" />}{l}</span>;
  return <div className="pbar"><I n="link" s={16} /><b>Loyihani sozlash:</b>{chip(!!p.ig_user_id, 'Instagram')}{p.kind === 'target' && chip(!!p.ad_account_id, 'Meta Ads')}{chip(!!(p.tg_bot_token && p.tg_chat_id), 'Telegram xabarlar')}
    <Link className="btn p sm" href={`/p/${p.id}/settings`}>Ulash</Link></div>;
}
export function Flash({ sp }: { sp: any }) {
  if (sp?.err) return <div className="alert">{sp.err}</div>;
  if (sp?.ok) return <div className="okm">{sp.ok === '1' ? 'Saqlandi' : sp.ok}</div>;
  return null;
}
