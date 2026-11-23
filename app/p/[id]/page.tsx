import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, graph } from '@/lib/s';
import { range, money, num } from '@/lib/ui';
import { accountStats, campaigns, grade } from '@/lib/meta';
import Shell from '@/components/Shell';
import { Reading, Range, Conn } from '@/components/Bits';
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
  const H = ({ k, l }: any) => <th className="r" aria-sort={sort === k ? (dir === -1 ? 'descending' : 'ascending') : 'none'}><a href={qs(k)}>{l}{sort === k ? (dir === -1 ? ' ↓' : ' ↑') : ''}</a></th>;
  const ctr = (c: any) => (c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) + '%' : 'yo\'q');
  return (<Shell project={p} active="stat" crumbs={[{ label: p.name, href: `/p/${id}` }, { label: 'Reklama' }]}>
    <div className="head"><div><h1>{p.name}: reklama</h1><p>{r.since} dan {r.until} gacha, avvalgi shuncha kun bilan solishtirilgan.</p></div><Conn p={p} /></div>
    <Range r={r} presets={[['today', 'Bugun'], ['yest', 'Kecha'], ['7', '7 kun'], ['14', '14 kun'], ['30', '30 kun'], ['90', '90 kun'], ['mtd', 'Shu oy']]} />
    {!p.ad_account_id ? <div className="empty"><b>Reklama kabineti tanlanmagan</b><p>Kabinetni ulang: xarajat, natijalar va kampaniyalar shu yerda chiqadi.</p><Link className="btn btn-p" href={`/p/${id}/settings`}>Kabinetni tanlash</Link></div>
      : err ? <div className="empty"><b>Meta ma'lumot bermadi</b><p className="bad">{err}</p><p>Token yoki kabinetga ruxsatni tekshiring.</p><Link className="btn" href="/settings">Sozlamalar</Link></div> : <>
        <dl className="readings">
          <Reading label="Sarf" v={money(cur.spend)} cur={cur.spend} prev={prev.spend} f={money} good="none" />
          <Reading label="Natijalar" v={num(cur.results)} cur={cur.results} prev={prev.results} f={num} good="up" />
          <Reading label="Bitta natija narxi" v={avg ? money(avg) : 'yo\'q'} cur={avg} prev={prev.results ? prev.spend / prev.results : 0} f={money} good="down" />
          <Reading label="Ko'rsatuvlar" v={num(cur.impressions)} sub={`CPM ${cur.impressions ? money((cur.spend / cur.impressions) * 1000) : 'yo\'q'}`} />
          <Reading label="Bosishlar" v={num(cur.clicks)} sub={`CTR ${ctr(cur)}, CPC ${cur.clicks ? money(cur.spend / cur.clicks) : 'yo\'q'}`} />
        </dl>
        <section className="sec" aria-labelledby="c-h"><div className="sec-h"><h2 id="c-h">Kampaniyalar</h2><p className="m cool">{camps.length}</p></div>
          {camps.length ? <div className="scroll"><table className="tbl stack"><thead><tr><th>Kampaniya</th><th>Holat</th><th>Baho</th><H k="spend" l="Sarf" /><H k="res" l="Natija" /><H k="cpl" l="Natija narxi" /><H k="imp" l="Ko'rsatuv" /><th className="r">Bosish</th><H k="ctr" l="CTR" /></tr></thead>
            <tbody>{camps.map(c => { const g = grade(c, avg), s = st[c.id]; return <tr key={c.id}>
              <td style={{ minWidth: '14rem' }}>{c.name}</td>
              <td>{s ? <span className={'chip' + (s === 'ACTIVE' ? ' chip-ok' : '')}>{s === 'ACTIVE' ? 'faol' : "to'xtagan"}</span> : 'yo\'q'}</td>
              <td><span className={'chip' + (g.cls === 'g' ? ' chip-ok' : g.cls === 'r' ? ' chip-bad' : '')}>{g.t.toLowerCase()}</span><div className="was">{g.tip}</div></td>
              <td className="r m" data-label="Sarf">{money(c.spend)}</td><td className="r m" data-label="Natija">{num(c.results)}</td><td className="r m" data-label="Narx">{c.results ? money(c.spend / c.results) : 'yo\'q'}</td>
              <td className="r m" data-label="Ko'rsatuv">{num(c.impressions)}</td><td className="r m" data-label="Bosish">{num(c.clicks)}</td><td className="r m" data-label="CTR">{ctr(c)}</td></tr>; })}</tbody>
            <tfoot><tr><td>Jami</td><td></td><td></td><td className="r m">{money(cur.spend)}</td><td className="r m">{num(cur.results)}</td><td className="r m">{avg ? money(avg) : 'yo\'q'}</td><td className="r m">{num(cur.impressions)}</td><td className="r m">{num(cur.clicks)}</td><td className="r m">{ctr(cur)}</td></tr></tfoot></table>
            <p className="tbl-foot">Natija: lid-forma va boshlangan yozishmalar. Baho kampaniya narxini kabinetning o'rtacha narxi bilan solishtiradi.</p></div>
            : <div className="empty"><b>Bu davrda sarf qilgan kampaniya yo'q</b><p>Boshqa davrni tanlab ko'ring.</p></div>}</section></>}
  </Shell>);
}
