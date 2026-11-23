import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, requireAuth, secret } from '@/lib/s';
import { range, money, num, q } from '@/lib/ui';
import { accountStats, sum } from '@/lib/meta';
import Shell, { Av } from '@/components/Shell';
import { Stat, RangeBar, Flash } from '@/components/Bits';
import I from '@/components/Icon';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export default async function Home({ searchParams }: any) {
  await requireAuth();
  const sp = await searchParams, r = range(sp, '30');
  const { data: ps, error: le } = await db().from('projects').select('*').order('created_at');
  const projects = ps || [], targets = projects.filter(p => p.kind === 'target'), content = projects.filter(p => p.kind !== 'target');
  const hasToken = !!(await secret('META_TOKEN'));
  const rows = await Promise.all(targets.map(async p => {
    if (!p.ad_account_id || !hasToken) return { p, cur: null as any, prev: null as any, err: '' };
    try { const [cur, prev] = await Promise.all([accountStats(p.ad_account_id, r.since, r.until), accountStats(p.ad_account_id, r.pSince, r.pUntil)]); return { p, cur, prev, err: '' }; }
    catch (e: any) { return { p, cur: null as any, prev: null as any, err: String(e.message) }; }
  }));
  const cur = sum(rows.filter(x => x.cur).map(x => x.cur)), prev = sum(rows.filter(x => x.prev).map(x => x.prev));
  const cpr = cur.results ? cur.spend / cur.results : 0, ppr = prev.results ? prev.spend / prev.results : 0;
  const s0 = new Date(r.since + 'T00:00:00+05:00').toISOString(), s1 = new Date(r.until + 'T23:59:59+05:00').toISOString();
  const { data: posts } = await db().from('ig_posts').select('project_id,status,scheduled_at,created_at');
  const { data: rules } = await db().from('autoreply_rules').select('project_id,active,sent');
  const at = (x: any) => x.scheduled_at || x.created_at;
  const pubIn = (pid?: string) => (posts || []).filter(x => x.status === 'published' && at(x) >= s0 && at(x) <= s1 && (!pid || x.project_id === pid)).length;
  const queued = (pid?: string) => (posts || []).filter(x => (x.status === 'scheduled' || x.status === 'publishing') && (!pid || x.project_id === pid)).length;
  const connected = projects.filter(p => p.ig_user_id || p.ad_account_id).length;
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const name = String(fd.get('name') || '').trim(), kind = fd.get('kind') === 'target' ? 'target' : 'kontent';
    if (!name) redirect('/?err=' + q('Loyiha nomini kiriting'));
    const { data, error } = await db().from('projects').insert({ name, kind }).select('id').single();
    if (error) redirect('/?err=' + q(error.message));
    redirect(`/p/${data!.id}/settings?ok=` + q("Loyiha yaratildi — endi akkauntlarni ulang"));
  }
  const delta = (c: number, p: number) => { if (!p || !c) return null; const d = Math.round(((c - p) / p) * 100); return <small className={d <= 0 ? 'g' : 'r'}> {d <= 0 ? '▼' : '▲'}</small>; };
  const ints = [
    { n: 'Meta Ads', d: 'Facebook va Instagram reklama statistikasi', ic: 'meta', c: '#1877f2', s: hasToken ? 'Tayyor' : 'Token kerak', ok: hasToken, href: '/settings' },
    { n: 'Instagram', d: 'Post joylash, rejalashtirish va kalendar', ic: 'ig', c: 'linear-gradient(135deg,#f9a03f,#d62976,#7b3fe4)', s: 'Tayyor', ok: true },
    { n: 'Avtojavob', d: "Kalit so'zli kommentga avtomatik Direct", ic: 'bolt', c: '#4f8f83', s: 'Tayyor', ok: true },
    { n: 'Telegram', d: 'Yangi komment va Direct shu chatga xabar boradi', ic: 'send', c: '#2aa1da', s: 'Tayyor', ok: true },
    { n: 'amoCRM', d: "CRM'dagi lid va sotuvlarni reklamaga bog'lash", ic: 'crm', c: '#2f6fd8', s: 'Tez kunda', ok: false },
    { n: 'Google Sheets', d: 'Lidlarni jadvalga avtomatik yozish', ic: 'sheet', c: '#1e9e55', s: 'Tez kunda', ok: false },
  ];
  return (<Shell active="home" crumbs={[{ label: 'Umumiy' }]}>
    {le && <div className="alert">Xato: {le.message}</div>}<Flash sp={sp} />
    <div className="ph"><div><h1>Umumiy ko'rinish</h1><p className="m">Barcha loyihalar · {r.since} → {r.until} ({r.len} kun) · avvalgi {r.len} kun bilan solishtirma</p></div>
      <details className="pop"><summary className="btn p"><I n="plus" s={15} />Yangi loyiha</summary>
        <form action={add} className="popc"><b style={{ fontSize: 16 }}>Yangi loyiha</b>
          <label>Loyiha nomi<input name="name" required autoComplete="off" placeholder="Masalan: Weldmart" /></label>
          <div className="seg"><label><input type="radio" name="kind" value="kontent" defaultChecked />Kontent<small>Instagram postlar, avtojavob</small></label>
            <label><input type="radio" name="kind" value="target" />Target<small>Meta reklama statistikasi</small></label></div>
          <button className="btn p">Yaratish</button></form></details></div>
    <RangeBar r={r} presets={[['today', 'Bugun'], ['yest', 'Kecha'], ['7', '7 kun'], ['30', '30 kun'], ['90', '90 kun']]} />
    <div className="stats">
      <Stat label="Reklama xarajati" v={money(cur.spend)} cur={cur.spend} prev={prev.spend} f={money} good="none" />
      <Stat label="Natijalar (lid + xabar)" v={num(cur.results)} cur={cur.results} prev={prev.results} f={num} good="up" />
      <Stat label="Bitta natija narxi" v={cpr ? money(cpr) : '—'} cur={cpr} prev={ppr} f={money} good="down" />
      <Stat label="Kuniga o'rtacha xarajat" v={money(cur.spend / r.len)} sub={`${(cur.results / r.len).toFixed(1)} natija / kun`} />
      <Stat label="Ko'rsatuvlar" v={num(cur.impressions)} sub={`CPM ${cur.impressions ? money((cur.spend / cur.impressions) * 1000) : '—'}`} />
      <Stat label="Bosishlar" v={num(cur.clicks)} sub={`CTR ${cur.impressions ? ((cur.clicks / cur.impressions) * 100).toFixed(2) : '0'}% · CPC ${cur.clicks ? money(cur.spend / cur.clicks) : '—'}`} />
      <Stat label="Instagram postlar" v={num(pubIn())} sub={`davrda chiqdi · ${queued()} ta navbatda`} />
      <Stat label="Loyihalar / ulanishlar" v={`${projects.length} / ${connected}`} sub="jami loyiha / ulangan" />
    </div>
    <h2 className="h2">Target loyihalar</h2>
    <div className="card tbl">{targets.length ? <><table><thead><tr><th>Loyiha</th><th className="n">Xarajat</th><th className="n">Natija</th><th className="n">Natija narxi</th><th className="n">Ko'rsatuv</th><th className="n">Bosish</th><th></th></tr></thead>
      <tbody>{rows.map(({ p, cur: c, prev: pv, err }) => <tr key={p.id}>
        <td><div className="pn"><Av name={p.name} /><span><b>{p.name}</b><small>{err ? <span className="r">{err.slice(0, 60)}</span> : p.ad_account_id || 'Reklama kabineti ulanmagan'}</small></span></div></td>
        <td className="n">{c ? money(c.spend) : '—'}</td><td className="n">{c ? num(c.results) : '—'}</td>
        <td className="n">{c && c.results ? <>{money(c.spend / c.results)}{delta(c.spend / c.results, pv?.results ? pv.spend / pv.results : 0)}</> : '—'}</td>
        <td className="n">{c ? num(c.impressions) : '—'}</td><td className="n">{c ? num(c.clicks) : '—'}</td>
        <td style={{ textAlign: 'right' }}><Link className="btn sm" href={`/p/${p.id}`}>Ochish</Link></td></tr>)}</tbody></table>
      <div className="note">Natija narxi yonidagi belgi avvalgi davrga nisbatan: <span className="g">▼ arzonlashdi</span> · <span className="r">▲ qimmatlashdi</span></div></>
      : <p className="empty">Target loyiha yo'q. «Yangi loyiha» → Target.</p>}</div>
    <h2 className="h2">Kontent loyihalar <small className="mut">· Instagram postlari va avtojavob</small></h2>
    <div className="card tbl">{content.length ? <table><thead><tr><th>Loyiha</th><th className="n">Navbatda</th><th className="n">Davrda chiqdi</th><th className="n">Avtojavob qoidalari</th><th className="n">Direct yuborildi</th><th></th></tr></thead>
      <tbody>{content.map(p => { const rs = (rules || []).filter(x => x.project_id === p.id); return <tr key={p.id}>
        <td><div className="pn"><Av name={p.name} /><span><b>{p.name}</b><small>{p.ig_username ? '@' + p.ig_username : p.ig_user_id ? 'Instagram ulangan' : 'Instagram ulanmagan'}</small></span></div></td>
        <td className="n">{queued(p.id)}</td><td className="n">{pubIn(p.id)}</td><td className="n">{rs.filter(x => x.active).length} / {rs.length}</td><td className="n">{rs.reduce((s, x) => s + x.sent, 0)}</td>
        <td style={{ textAlign: 'right' }}><Link className="btn sm" href={`/p/${p.id}/instagram`}>Ochish</Link></td></tr>; })}</tbody></table>
      : <p className="empty">Kontent loyiha yo'q.</p>}</div>
    <h2 className="h2">Ulash mumkin bo'lgan dasturlar</h2>
    <div className="ints">{ints.map(x => <div key={x.n} className="int"><span className="ic" style={{ background: x.c }}><I n={x.ic} s={22} /></span>
      <div><b>{x.n}</b><p>{x.d}</p></div>{x.href && !x.ok ? <Link href={x.href} className="badge w">{x.s}</Link> : <span className={'badge' + (x.ok ? ' g' : '')}>{x.s}</span>}</div>)}</div>
  </Shell>);
}
