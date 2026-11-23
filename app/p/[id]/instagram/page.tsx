import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth } from '@/lib/s';
import { publishPost } from '@/lib/ig';
import { dt, hm, today, dayOf, addDays, q } from '@/lib/ui';
import Shell from '@/components/Shell';
import { ProjectBar, Flash } from '@/components/Bits';
import I from '@/components/Icon';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const TABS: [string, string, string[]][] = [['q', 'Navbatda', ['scheduled', 'publishing']], ['pub', 'Chiqqanlar', ['published']], ['draft', 'Qoralama', ['draft']], ['err', 'Xato / bekor', ['failed', 'canceled']]];
const SL: Record<string, [string, string]> = { scheduled: ['Navbatda', 'a'], publishing: ['Chiqmoqda', 'a'], published: ['Chiqdi', 'g'], draft: ['Qoralama', ''], failed: ['Xato', 'r'], canceled: ['Bekor', 'r'] };
const WD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
export default async function Ig({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams;
  const tab = TABS.find(t => t[0] === sp?.s) ? sp.s : 'q', view = sp?.v === 'cal' ? 'cal' : 'list';
  const { data: p } = await db().from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const { data: all } = await db().from('ig_posts').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(500);
  const posts = all || [], at = (x: any) => x.scheduled_at || x.created_at;
  const of = (k: string) => posts.filter(x => TABS.find(t => t[0] === k)![2].includes(x.status));
  const list = of(tab).sort((a, b) => (tab === 'q' ? 1 : -1) * (Date.parse(at(a)) - Date.parse(at(b))));
  const next = of('q').sort((a, b) => Date.parse(at(a)) - Date.parse(at(b)))[0];
  const path = `/p/${id}/instagram`;
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const file = fd.get('file') as File, caption = String(fd.get('caption') || ''), when = String(fd.get('at') || ''), mode = String(fd.get('mode'));
    if (!file?.size) redirect(path + '?err=' + q('Rasm tanlanmadi (JPEG)'));
    if (file.size > 4 * 1024 * 1024) redirect(path + '?err=' + q('Rasm 4 MB dan katta'));
    if (mode === 'schedule' && !when) redirect(path + '?err=' + q('Rejalashtirish uchun sana va vaqtni tanlang'));
    const name = `${id}/${Date.now()}.jpg`;
    const up = await db().storage.from('posts').upload(name, Buffer.from(await file.arrayBuffer()), { contentType: 'image/jpeg' });
    if (up.error) redirect(path + '?err=' + q(up.error.message));
    const url = db().storage.from('posts').getPublicUrl(name).data.publicUrl;
    const iso = mode === 'schedule' ? new Date(when + ':00+05:00').toISOString() : new Date().toISOString();
    const { data: r, error } = await db().from('ig_posts').insert({ project_id: id, caption, media_url: url, scheduled_at: iso, status: mode === 'draft' ? 'draft' : 'scheduled' }).select('*').single();
    if (error) redirect(path + '?err=' + q(error.message));
    if (mode === 'now') await publishPost(r);
    revalidatePath(path);
    redirect(path + (mode === 'now' ? '?s=pub' : mode === 'draft' ? '?s=draft' : ''));
  }
  async function act(fd: FormData) {
    'use server'; await requireAuth();
    const pid = String(fd.get('pid')), op = String(fd.get('op'));
    const { data: r } = await db().from('ig_posts').select('*').eq('id', pid).eq('project_id', id).maybeSingle();
    if (r) {
      if (op === 'del') await db().from('ig_posts').delete().eq('id', pid);
      if (op === 'cancel') await db().from('ig_posts').update({ status: 'canceled' }).eq('id', pid);
      if (op === 'queue') await db().from('ig_posts').update({ status: 'scheduled', error: null, scheduled_at: new Date().toISOString() }).eq('id', pid);
      if (op === 'now' && r.media_url) await publishPost(r);
    }
    revalidatePath(path);
  }
  const m = /^\d{4}-\d{2}$/.test(sp?.m || '') ? sp.m : today().slice(0, 7);
  const [Y, M] = m.split('-').map(Number), first = `${m}-01`, dow = (new Date(Date.UTC(Y, M - 1, 1)).getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - dow));
  const pm = new Date(Date.UTC(Y, M - 2, 1)).toISOString().slice(0, 7), nm = new Date(Date.UTC(Y, M, 1)).toISOString().slice(0, 7);
  const byDay: Record<string, any[]> = {};
  for (const x of posts) (byDay[dayOf(at(x))] ||= []).push(x);
  const st = (k: string, l: string, n: number, sub?: string) => <div className="st"><span>{l}</span><b>{n}</b>{sub && <small>{sub}</small>}</div>;
  return (<Shell project={p} active="ig" crumbs={[{ label: p.name, href: `/p/${id}` }, { label: 'Instagram' }]}>
    <ProjectBar p={p} /><Flash sp={sp} />
    <div className="ph"><div><h1>Kontent</h1><p className="m">Instagram postlari: joylash va rejalashtirish · Toshkent vaqti</p></div>
      <span className="row"><I n="ig" />{p.ig_username ? <b>@{p.ig_username}</b> : <Link className="badge w" href={`/p/${id}/settings`}>Instagram ulanmagan</Link>}</span></div>
    <details className="inl card"><summary className="btn p" style={{ width: 'fit-content' }}><I n="plus" s={15} />Yangi post</summary>
      <form action={add} className="form">
        <div className="fg"><label>Rasm (JPEG, 4 MB gacha)<input type="file" name="file" accept="image/jpeg" required /></label>
          <label>Sana va vaqt (rejalashtirish uchun)<input type="datetime-local" name="at" min={today() + 'T00:00'} /></label></div>
        <label>Matn (caption)<textarea name="caption" rows={4} placeholder="Post matni, heshteglar..." /></label>
        <div className="seg"><label><input type="radio" name="mode" value="now" defaultChecked />Hozir joylash<small>darhol Instagramga chiqadi</small></label>
          <label><input type="radio" name="mode" value="schedule" />Rejalashtirish<small>tanlangan vaqtda chiqadi</small></label>
          <label><input type="radio" name="mode" value="draft" />Qoralama<small>keyinroq chiqarasiz</small></label></div>
        <div><button className="btn p">Saqlash</button></div></form></details>
    <div className="stats">{st('q', 'Navbatda', of('q').length, next ? `Keyingisi: ${dt(at(next))}` : "Reja bo'sh")}{st('pub', 'Chiqqan', of('pub').length)}{st('draft', 'Qoralama', of('draft').length)}{st('err', 'Xato / bekor', of('err').length)}</div>
    <div className="tabs">{view === 'list' && TABS.map(([k, l]) => <Link key={k} href={`?s=${k}`} className={'btn sm' + (tab === k ? ' on' : '')}>{l} ({of(k).length})</Link>)}
      {view === 'cal' && <><Link className="btn sm" href={`?v=cal&m=${pm}`}>‹</Link><b style={{ minWidth: 120, textAlign: 'center' }}>{new Date(Date.UTC(Y, M - 1, 1)).toLocaleDateString('uz', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b><Link className="btn sm" href={`?v=cal&m=${nm}`}>›</Link></>}
      <span className="sp" /><Link href="?v=list" className={'btn sm' + (view === 'list' ? ' on' : '')}><I n="list" s={14} />Ro'yxat</Link><Link href="?v=cal" className={'btn sm' + (view === 'cal' ? ' on' : '')}><I n="cal" s={14} />Kalendar</Link></div>
    {view === 'list' ? <div className="card tbl">{list.length ? list.map(x => <div key={x.id} className="post">
      {x.media_url ? <img className="thumb" src={x.media_url} alt="" /> : <span className="thumb" />}
      <div className="tx"><p>{x.caption || <span className="mut">Matnsiz</span>}</p><span className="row"><span className={'badge ' + SL[x.status]?.[1]}>{SL[x.status]?.[0] || x.status}</span><small>{dt(at(x))}</small>{x.error && <small className="r">{x.error}</small>}</span></div>
      <form action={act} className="row"><input type="hidden" name="pid" value={x.id} />
        {(x.status === 'scheduled' || x.status === 'draft' || x.status === 'failed') && <button className="btn sm p" name="op" value="now"><I n="play" s={12} />Hozir chiqarish</button>}
        {(x.status === 'draft' || x.status === 'canceled') && <button className="btn sm" name="op" value="queue">Navbatga</button>}
        {x.status === 'scheduled' && <button className="btn sm" name="op" value="cancel">Bekor qilish</button>}
        {x.status !== 'published' && <button className="btn sm d" name="op" value="del">O'chirish</button>}</form></div>) : <p className="empty">Bo'sh</p>}</div>
      : <div className="cal">{WD.map(w => <div key={w} className="hd">{w}</div>)}{cells.map(d => <div key={d} className={(d.slice(0, 7) !== m ? 'out' : '') + (d === today() ? ' td' : '')}>
        <b>{Number(d.slice(8))}</b>{(byDay[d] || []).sort((a, b) => Date.parse(at(a)) - Date.parse(at(b))).map(x => <span key={x.id} className={'ev ' + x.status} title={x.caption || ''}>{hm(at(x))} {x.caption || 'Rasm'}</span>)}</div>)}</div>}
    <p className="hint">Navbatdagi postlar har 5 daqiqada tekshiriladi. Highlight'ga qo'shish va musiqa API orqali mumkin emas — telefonda qilinadi.</p>
  </Shell>);
}
