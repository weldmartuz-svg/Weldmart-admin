import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, tg, tgToken } from '@/lib/s';
import { dt, q, handle } from '@/lib/ui';
import Shell from '@/components/Shell';
import { Conn, Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
const F: [string, string][] = [['all', 'Hammasi'], ['comment', 'Kommentlar'], ['message', 'Direct']];
export default async function Inbox({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams, f = F.find(x => x[0] === sp?.f) ? sp.f : 'all';
  const { data: p } = await db().from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  let qb = db().from('ig_events').select('id,kind,from_name,body,created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(100);
  if (f !== 'all') qb = qb.eq('kind', f);
  const { data: evs, error } = await qb;
  const path = `/p/${id}/inbox`;
  async function send(fd: FormData) {
    'use server'; await requireAuth();
    let m = '?ok=' + q('Telegramga yuborildi.');
    try { if (!p!.tg_chat_id) throw new Error('Loyiha Telegram chatga ulanmagan. Sozlamalardan ulang.'); const t = await tgToken(p); if (!t) throw new Error('Telegram bot sozlanmagan.'); await tg(t, p!.tg_chat_id, String(fd.get('text') || '')); } catch (e: any) { m = '?err=' + q(e.message); }
    revalidatePath(path); redirect(path + m);
  }
  return (<Shell project={p} active="inbox" crumbs={[{ label: handle(p), href: `/p/${id}/instagram` }, { label: 'Xabarlar' }]}>
    <Flash sp={sp} />
    <div className="head"><div><h1>{handle(p)}: xabarlar</h1><p>Komment va Direct'lar Meta webhook orqali real vaqtda keladi, har biri Telegram chatga ham yuboriladi.</p></div><Conn p={p} /></div>
    <nav className="seg" aria-label="Turi">{F.map(([k, l]) => <a key={k} href={`?f=${k}`} {...(f === k ? { 'aria-current': 'true' } : {})}>{l}</a>)}</nav>
    {error ? <p className="note note-bad">Xabarlarni o'qib bo'lmadi: {error.message}</p>
      : evs?.length ? <div className="scroll"><table className="tbl stack"><thead><tr><th>Vaqt</th><th>Turi</th><th>Kimdan</th><th>Matn</th></tr></thead>
        <tbody>{evs.map(e => <tr key={e.id}><td className="m cool">{dt(e.created_at)}</td><td><span className={'chip ' + (e.kind === 'message' ? 'chip-acc' : '')}>{e.kind === 'message' ? 'Direct' : 'komment'}</span></td><td className="amber">{e.from_name || 'yo\'q'}</td><td style={{ minWidth: '18rem' }}>{e.body}</td></tr>)}</tbody></table></div>
        : <div className="empty"><b>Hozircha xabar yo'q</b><p>Meta webhook ulangach, shu akkauntga yozilgan har bir komment va Direct shu yerda paydo bo'ladi.</p></div>}
    <form action={send} className="panel form"><h2>Telegram chatga xabar</h2><label className="field"><span>Matn</span><textarea name="text" rows={3} required /><span className="help">{p.tg_chat_id ? 'Loyihaning ulangan chatiga boradi.' : 'Avval loyihani Telegram chatga ulang.'}</span></label><div><button type="submit" className="btn">Yuborish</button></div></form>
  </Shell>);
}
