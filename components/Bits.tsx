import Link from 'next/link';
export function Reading({ label, v, cur, prev, f, good, sub }: any) {
  let d: any = null;
  if (good && prev !== undefined) {
    if (prev > 0 && cur >= 0) { const p = Math.round(((cur - prev) / prev) * 100), up = p >= 0; const cls = good === 'none' ? 'muted' : (good === 'up') === up ? 'ok' : 'bad'; d = <span className="was"><span className={cls}>{up ? '+' : '−'}{Math.abs(p)}%</span> avvalgi davrga nisbatan ({f(prev)})</span>; }
    else d = <span className="was">Avvalgi davrda ma'lumot yo'q</span>;
  }
  return <div><dt>{label}</dt><dd className={'reading' + (/^[^0-9$]/.test(String(v)) ? ' na' : '')}>{v}</dd>{d}{sub && <span className="was">{sub}</span>}</div>;
}
export function Range({ r, presets }: { r: any; presets: string[][] }) {
  return <div className="range"><nav className="seg" aria-label="Davr">{presets.map(([k, l]) => <a key={k} href={`?d=${k}`} {...(r.d === k ? { 'aria-current': 'true' } : {})}>{l}</a>)}</nav>
    <form method="get"><label className="visually-hidden" htmlFor="from">Boshlanish</label><input id="from" type="date" name="from" defaultValue={r.since} /><span>dan</span>
      <label className="visually-hidden" htmlFor="to">Tugash</label><input id="to" type="date" name="to" defaultValue={r.until} /><span>gacha</span><button type="submit" className="btn btn-s">Ko'rsatish</button></form></div>;
}
export function Conn({ p }: { p: any }) {
  const st = (ok: boolean, l: string) => <span className={'chip' + (ok ? ' chip-ok' : '')}>{l}: {ok ? 'ulangan' : 'yo\'q'}</span>;
  return <div className="row">{st(!!p.ig_user_id, 'Instagram')}{p.kind === 'target' && st(!!p.ad_account_id, 'Reklama kabineti')}{st(!!p.tg_chat_id, 'Telegram')}
    {(!p.ig_user_id || !p.tg_chat_id) && <Link className="btn btn-s" href={`/p/${p.id}/settings`}>Ulash</Link>}</div>;
}
export function Flash({ sp }: { sp: any }) {
  if (sp?.err) return <p className="note note-bad" role="alert">{sp.err}</p>;
  if (sp?.ok) return <p className="note note-ok" role="status">{sp.ok === '1' ? 'Saqlandi.' : sp.ok}</p>;
  return null;
}
export function Confirm({ label, children, tone = 'bad' }: { label: string; children: any; tone?: 'bad' | 'plain' }) {
  return <details className="confirm"><summary className={'btn btn-s' + (tone === 'bad' ? ' btn-bad' : '')}>{label}</summary><span className="row">Rostdanmi? {children}</span></details>;
}
