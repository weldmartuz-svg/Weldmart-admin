import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, tg, dec } from '@/lib/s';
import { dt, q } from '@/lib/ui';
import Shell from '@/components/Shell';
import { ProjectBar, Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
const F: [string, string][] = [['all', 'Hammasi'], ['comment', 'Kommentlar'], ['message', 'Direct']];
export default async function Inbox({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams, f = F.find(x => x[0] === sp?.f) ? sp.f : 'all';
  const { data: p } = await db().from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  let qb = db().from('ig_events').select('id,kind,from_name,body,created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(100);
  if (f !== 'all') qb = qb.eq('kind', f);
  const { data: evs } = await qb;
  const path = `/p/${id}/inbox`;
  async function send(fd: FormData) {
    'use server'; await requireAuth();
    let m = '?ok=' + q('Telegramga yuborildi');
    try { if (!p!.tg_bot_token || !p!.tg_chat_id) throw new Error('Telegram bot va chat ID sozlanmagan'); await tg(dec(p!.tg_bot_token), p!.tg_chat_id, String(fd.get('text') || '')); } catch (e: any) { m = '?err=' + q(e.message); }
    revalidatePath(path); redirect(path + m);
  }
  return (<Shell project={p} active="inbox" crumbs={[{ label: p.name, href: `/p/${id}` }, { label: 'Xabarlar' }]}>
    <ProjectBar p={p} /><Flash sp={sp} />
    <div><h1>Xabarlar</h1><p className="m">Instagram komment va Direct'lari (webhook orqali real vaqtda). Har yangisi Telegram chatga ham boradi.</p></div>
    <div className="tabs">{F.map(([k, l]) => <Link key={k} href={`?f=${k}`} className={'btn sm' + (f === k ? ' on' : '')}>{l}</Link>)}</div>
    <div className="card tbl">{evs?.length ? evs.map(e => <div key={e.id} className="evr"><span className="row"><span className={'badge ' + (e.kind === 'message' ? 'a' : '')}>{e.kind === 'message' ? 'Direct' : e.kind === 'comment' ? 'Komment' : e.kind}</span><b>{e.from_name || '—'}</b><small>{dt(e.created_at)}</small></span><div>{e.body}</div></div>)
      : <p className="empty">Hozircha xabar yo'q. Meta webhook ulangach shu yerda paydo bo'ladi.</p>}</div>
    <form action={send} className="card form"><h3>Telegram chatga xabar yuborish</h3><textarea name="text" rows={3} required placeholder="Xabar matni" /><div><button className="btn p">Yuborish</button></div></form>
  </Shell>);
}
