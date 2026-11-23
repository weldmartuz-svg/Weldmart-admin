import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, requireAuth, secret } from '@/lib/s';
import { range, money, num, dt, q, handle } from '@/lib/ui';
import { accountStats, sum } from '@/lib/meta';
import Shell, { Av, projHome } from '@/components/Shell';
import { Reading, Range, Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export default async function Home({ searchParams }: any) {
  await requireAuth();
  const sp = await searchParams, r = range(sp, '30');
  const [{ data: ps, error: le }, tok, { data: posts }, { data: rules }, { data: tgc }] = await Promise.all([
    db().from('projects').select('*').order('created_at'), secret('META_TOKEN'),
    db().from('ig_posts').select('id,project_id,status,scheduled_at,created_at,caption'), db().from('autoreply_rules').select('project_id,active,sent'), db().from('telegram_chats').select('type,status')]);
  const projects = ps || [], targets = projects.filter(p => p.kind === 'target');
  const hasToken = !!tok;
  const rows = await Promise.all(targets.map(async p => {
    if (!p.ad_account_id || !hasToken) return { p, cur: null as any, prev: null as any, err: '' };
    try { const [cur, prev] = await Promise.all([accountStats(p.ad_account_id, r.since, r.until), accountStats(p.ad_account_id, r.pSince, r.pUntil)]); return { p, cur, prev, err: '' }; }
    catch (e: any) { return { p, cur: null as any, prev: null as any, err: String(e.message) }; }
  }));
  const cur = sum(rows.filter(x => x.cur).map(x => x.cur)), prev = sum(rows.filter(x => x.prev).map(x => x.prev));
  const cpr = cur.results ? cur.spend / cur.results : 0, ppr = prev.results ? prev.spend / prev.results : 0;
  const s0 = new Date(r.since + 'T00:00:00+05:00').toISOString(), s1 = new Date(r.until + 'T23:59:59+05:00').toISOString();
  const tgUsers = (tgc || []).filter(c => c.type === 'private' && c.status === 'active').length;
  const at = (x: any) => x.scheduled_at || x.created_at;
  const pubIn = (pid?: string) => (posts || []).filter(x => x.status === 'published' && at(x) >= s0 && at(x) <= s1 && (!pid || x.project_id === pid)).length;
  const queue = (posts || []).filter(x => x.status === 'scheduled').sort((a, b) => Date.parse(at(a)) - Date.parse(at(b)));
  const qOf = (pid: string) => queue.filter(x => x.project_id === pid).length;
  const sent = (rules || []).reduce((s, x) => s + x.sent, 0);
  const byId = Object.fromEntries(projects.map(p => [p.id, p]));
  const igs = projects.filter(p => p.ig_user_id || p.kind !== 'target');
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const name = String(fd.get('name') || '').trim();
    if (!name) redirect('/?err=' + q('Loyiha nomini kiriting.'));
    const { data, error } = await db().from('projects').insert({ name, kind: 'target' }).select('id').single();
    if (error) redirect('/?err=' + q(error.message));
    redirect(`/p/${data!.id}/settings?ok=` + q('Loyiha yaratildi. Endi reklama kabinetini tanlang.'));
  }
  return (<Shell active="home" crumbs={[{ label: 'Umumiy' }]}>
    {le && <p className="note note-bad" role="alert">Bazaga ulanib bo'lmadi: {le.message}</p>}<Flash sp={sp} />
    <div className="head"><div><h1>Umumiy ko'rinish</h1><p>{r.since} dan {r.until} gacha, {r.len} kun. Har bir son avvalgi {r.len} kun bilan solishtiriladi.</p></div>
      {igs[0] ? <Link className="btn btn-p" href={`/p/${igs[0].id}/instagram`}>Yangi post</Link> : <Link className="btn btn-p" href="/accounts">Instagram ulash</Link>}</div>
    <Range r={r} presets={[['today', 'Bugun'], ['yest', 'Kecha'], ['7', '7 kun'], ['30', '30 kun'], ['90', '90 kun']]} />

    <section className="sec" aria-labelledby="q-h">
      <div className="sec-h"><h2 id="q-h">Navbat</h2><p>{queue.length ? `${queue.length} ta post kutmoqda, har 5 daqiqada tekshiriladi` : ''}</p></div>
      {queue.length ? <ol className="trail">{queue.slice(0, 8).map(x => <li key={x.id}><span className="when">{dt(x.scheduled_at)}</span><span className="acct">{handle(byId[x.project_id])}</span><span className="what">{x.caption || 'Matnsiz post'}</span>
        <Link className="btn btn-q btn-s" href={`/p/${x.project_id}/instagram`}>Ochish</Link></li>)}</ol>
        : <div className="empty"><b>Navbat bo'sh</b><p>Rejalashtirilgan postlar shu yerda, hamma akkauntlardan vaqt bo'yicha bitta qatorda turadi.</p>
          {igs[0] ? <Link className="btn" href={`/p/${igs[0].id}/instagram`}>Post rejalashtirish</Link> : <Link className="btn" href="/accounts">Avval akkaunt ulang</Link>}</div>}
    </section>

    <dl className="readings">
      <Reading label="Ulangan akkauntlar" v={num(projects.filter(p => p.ig_user_id).length)} sub={`${projects.length} ta loyihadan`} />
      <Reading label="Davrda chiqqan postlar" v={num(pubIn())} />
      <Reading label="Avtojavob Direct'lari" v={num(sent)} sub="jami yuborilgan" />
      <Reading label="Telegram foydalanuvchilar" v={num(tgUsers)} sub="barcha botlarda" />
      {targets.length > 0 && <Reading label="Reklama xarajati" v={money(cur.spend)} cur={cur.spend} prev={prev.spend} f={money} good="none" />}
      {targets.length > 0 && <Reading label="Bitta natija narxi" v={cpr ? money(cpr) : 'yo\'q'} cur={cpr} prev={ppr} f={money} good="down" />}
    </dl>

    <section className="sec" aria-labelledby="a-h">
      <div className="sec-h"><h2 id="a-h">Instagram akkauntlar</h2></div>
      {igs.length ? <div className="scroll"><table className="tbl stack"><thead><tr><th>Akkaunt</th><th className="r">Navbatda</th><th className="r">Davrda chiqdi</th><th className="r">Avtojavob</th><th className="r">Direct yuborildi</th><th>Telegram</th><th><span className="visually-hidden">Amal</span></th></tr></thead>
        <tbody>{igs.map(p => { const rs = (rules || []).filter(x => x.project_id === p.id); return <tr key={p.id}>
          <td><div className="who-cell"><Av name={p.ig_username || p.name} /><span><b>{handle(p)}</b><small>{p.ig_user_id ? p.name : 'Instagram ulanmagan'}</small></span></div></td>
          <td className="r m" data-label="Navbatda">{qOf(p.id)}</td><td className="r m" data-label="Chiqdi">{pubIn(p.id)}</td>
          <td className="r m" data-label="Avtojavob">{rs.filter(x => x.active).length}/{rs.length}</td><td className="r m" data-label="Direct">{rs.reduce((s, x) => s + x.sent, 0)}</td>
          <td>{p.tg_chat_id ? <span className="chip chip-ok">ulangan</span> : <span className="chip">yo'q</span>}</td>
          <td className="r"><Link className="btn btn-s" href={projHome(p)}>Ochish</Link></td></tr>; })}</tbody></table></div>
        : <div className="empty"><b>Hali akkaunt yo'q</b><p>Meta tokendagi Instagram akkauntlar ro'yxatidan kerakligini bir bosishda ulaysiz.</p><Link className="btn" href="/accounts">Akkauntlarni ko'rish</Link></div>}
    </section>

    <section className="sec" aria-labelledby="ads-h">
      <div className="sec-h"><h2 id="ads-h">Meta Ads Manager</h2></div>
      {targets.length > 0 && <div className="scroll"><table className="tbl stack"><thead><tr><th>Loyiha</th><th className="r">Xarajat</th><th className="r">Natija</th><th className="r">Natija narxi</th><th className="r">Ko'rsatuv</th><th className="r">Bosish</th><th><span className="visually-hidden">Amal</span></th></tr></thead>
        <tbody>{rows.map(({ p, cur: c, prev: pv, err }) => { const cp = c?.results ? c.spend / c.results : 0, pp = pv?.results ? pv.spend / pv.results : 0; return <tr key={p.id}>
          <td><div className="who-cell"><Av name={p.name} /><span><b>{p.name}</b><small>{err ? <span className="bad">{err.slice(0, 70)}</span> : p.ad_account_id || 'Kabinet tanlanmagan'}</small></span></div></td>
          <td className="r m" data-label="Xarajat">{c ? money(c.spend) : 'yo\'q'}</td><td className="r m" data-label="Natija">{c ? num(c.results) : 'yo\'q'}</td>
          <td className="r m" data-label="Narx">{cp ? money(cp) : 'yo\'q'}{cp && pp ? <span className={cp <= pp ? 'ok' : 'bad'}> {cp <= pp ? '−' : '+'}{Math.abs(Math.round(((cp - pp) / pp) * 100))}%</span> : null}</td>
          <td className="r m" data-label="Ko'rsatuv">{c ? num(c.impressions) : 'yo\'q'}</td><td className="r m" data-label="Bosish">{c ? num(c.clicks) : 'yo\'q'}</td>
          <td className="r"><Link className="btn btn-s" href={`/p/${p.id}`}>Ochish</Link></td></tr>; })}</tbody></table>
        <p className="tbl-foot">Natija narxi yonidagi foiz avvalgi davrga nisbatan: yashil arzonlashganini, qizil qimmatlashganini bildiradi.</p></div>}
      {!hasToken && <p className="note">Reklama raqamlari Meta token kiritilgach chiqadi. <Link href="/settings">Sozlamalar</Link></p>}
      <details className="disc"><summary className="btn">Reklama loyihasi qo'shish</summary>
        <form action={add} className="panel form" style={{ maxWidth: '32rem' }}><label className="field"><span>Loyiha nomi</span><input name="name" required autoComplete="off" placeholder="Weldmart reklama" /><span className="help">Keyingi qadamda reklama kabinetini tanlaysiz.</span></label>
          <div><button type="submit" className="btn btn-p">Yaratish</button></div></form></details>
    </section>
  </Shell>);
}
