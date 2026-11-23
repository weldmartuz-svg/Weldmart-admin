import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, graph } from '@/lib/s';
import { range, money, num } from '@/lib/ui';
import { accountStats, campaigns, grade } from '@/lib/meta';
import Shell from '@/components/Shell';
import { Stat, RangeBar, ProjectBar } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const SORT: Record<string, (c: any) => number> = { spend: c => c.spend, res: c => c.results, cpl: c => (c.results ? c.spend / c.results : 1e9), ctr: c => (c.impressions ? c.clicks / c.impressions : 0), imp: c => c.impressions };
export default async function P({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams;
  const { data: p } = await db().from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  if (p.kind !== 'target') redirect(`/p/${id}/instagram`);
  const r = range(sp, '7');
  let cur: any = null, prev: any = null, camps: any[] = [], err = '';
  const st: Record<string, string> = {};
  if (p.ad_account_id) {
    try {
      [cur, prev, camps] = await Promise.all([accountStats(p.ad_account_id, r.since, r.until), accountStats(p.ad_account_id, r.pSince, r.pUntil), campaigns(p.ad_account_id, r.since, r.until)]);
      try { for (const x of (await graph(`${p.ad_account_id}/campaigns`, { fields: 'id,effective_status', limit: '300' })).data || []) st[x.id] = x.effective_status; } catch {}
    } catch (e: any) { err = String(e.message); }
  }
  const sort = SORT[sp?.s] ? sp.s : 'spend', dir = sp?.o === 'asc' ? 1 : -1;
  camps.sort((a, b) => (SORT[sort](a) - SORT[sort](b)) * dir);
  const avg = cur?.results ? cur.spend / cur.results : 0;
  const qs = (s: string) => `?${new URLSearchParams({ ...(sp?.d ? { d: sp.d } : {}), ...(sp?.from ? { from: sp.from, to: sp.to } : {}), s, o: sort === s && dir === -1 ? 'asc' : 'desc' })}`;
  const H = ({ k, l }: any) => <th className="n"><a href={qs(k)}>{l}{sort === k ? (dir === -1 ? ' ↓' : ' ↑') : ' ⇅'}</a></th>;
  const active = camps.filter(c => st[c.id] === 'ACTIVE').length;
  return (<Shell project={p} active="stat" crumbs={[{ label: p.name, href: `/p/${id}` }, { label: 'Umumiy stat' }]}>
    <ProjectBar p={p} />
    <div><h1>Umumiy stat</h1><p className="m">{p.name} · {r.since} → {r.until} · avvalgi davr bilan solishtirilgan</p></div>
    <RangeBar r={r} presets={[['today', 'Bugun'], ['yest', 'Kecha'], ['7', '7 kun'], ['14', '14 kun'], ['30', '30 kun'], ['90', '90 kun'], ['mtd', 'Shu oy']]} />
    {!p.ad_account_id ? <div className="card" style={{ textAlign: 'center', padding: 40 }}><h3>Reklama statistikasi hali yo'q</h3><p className="m">Meta reklama kabinetini ulang — xarajat, natijalar va kampaniyalar shu yerda chiqadi.</p><p><Link className="btn p" href={`/p/${id}/settings`}>Ulash</Link></p></div>
      : err ? <div className="alert">Meta xatosi: {err}</div> : <>
        <div className="stats">
          <Stat label="Sarf" v={money(cur.spend)} cur={cur.spend} prev={prev.spend} f={money} good="none" />
          <Stat label="Natijalar (lid + xabar)" v={num(cur.results)} cur={cur.results} prev={prev.results} f={num} good="up" />
          <Stat label="Bitta natija narxi" v={avg ? money(avg) : '—'} cur={avg} prev={prev.results ? prev.spend / prev.results : 0} f={money} good="down" />
          <Stat label="Ko'rsatuvlar" v={num(cur.impressions)} sub={`CPM ${cur.impressions ? money((cur.spend / cur.impressions) * 1000) : '—'}`} />
          <Stat label="Bosishlar" v={num(cur.clicks)} sub={`CTR ${cur.impressions ? ((cur.clicks / cur.impressions) * 100).toFixed(2) : 0}% · CPC ${cur.clicks ? money(cur.spend / cur.clicks) : '—'}`} />
          <Stat label="Kampaniyalar" v={num(camps.length)} sub={`${active} ta faol · davrda sarf qilganlar`} />
        </div>
        <h2 className="h2">Kampaniyalar <small className="mut">({camps.length})</small></h2>
        <div className="card tbl">{camps.length ? <><table><thead><tr><th>Kampaniya</th><th>Holat</th><th>Baho</th><H k="spend" l="Sarf" /><H k="res" l="Natija" /><H k="cpl" l="Natija narxi" /><H k="imp" l="Ko'rsatuv" /><th className="n">Bosish</th><H k="ctr" l="CTR" /><th className="n">CPC</th></tr></thead>
          <tbody>{camps.map(c => { const g = grade(c, avg); const s = st[c.id]; return <tr key={c.id}>
            <td style={{ whiteSpace: 'normal', minWidth: 200 }}><b>{c.name}</b></td>
            <td><span className={'badge' + (s === 'ACTIVE' ? ' g' : '')}>{s === 'ACTIVE' ? 'Faol' : s ? 'Nofaol' : '—'}</span></td>
            <td><span className={'badge ' + g.cls}>{g.t}</span><br /><small>{g.tip}</small></td>
            <td className="n">{money(c.spend)}</td><td className="n">{num(c.results)}</td><td className="n">{c.results ? money(c.spend / c.results) : '—'}</td>
            <td className="n">{num(c.impressions)}</td><td className="n">{num(c.clicks)}</td><td className="n">{c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) + '%' : '—'}</td><td className="n">{c.clicks ? money(c.spend / c.clicks) : '—'}</td></tr>; })}</tbody>
          <tfoot><tr><td>Jami ({camps.length})</td><td></td><td></td><td className="n">{money(cur.spend)}</td><td className="n">{num(cur.results)}</td><td className="n">{avg ? money(avg) : '—'}</td><td className="n">{num(cur.impressions)}</td><td className="n">{num(cur.clicks)}</td><td className="n">{cur.impressions ? ((cur.clicks / cur.impressions) * 100).toFixed(2) + '%' : '—'}</td><td className="n">{cur.clicks ? money(cur.spend / cur.clicks) : '—'}</td></tr></tfoot></table>
          <div className="note">Natija = lid-forma + boshlangan yozishmalar. Baho kampaniya natija narxini kabinetning o'rtacha narxi bilan solishtiradi. Ustun nomini bosing — saralanadi.</div></>
          : <p className="empty">Bu davrda sarf qilgan kampaniya yo'q.</p>}</div></>}
  </Shell>);
}
