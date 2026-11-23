import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth } from '@/lib/s';
import { publishPost } from '@/lib/ig';
import { dt, hm, today, dayOf, addDays, q, handle } from '@/lib/ui';
import Shell from '@/components/Shell';
import { AcctTabs } from '@/components/Tabs';

import { Conn, Flash, Act } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const TABS: [string, string, string[]][] = [['q', 'Navbatda', ['scheduled', 'publishing']], ['pub', 'Chiqqan', ['published']], ['draft', 'Qoralama', ['draft']], ['err', 'Xato yoki bekor', ['failed', 'canceled']]];
const SL: Record<string, [string, string]> = { scheduled: ['navbatda', 'chip-cool'], publishing: ['chiqmoqda', 'chip-cool'], published: ['chiqdi', 'chip-ok'], draft: ['qoralama', ''], failed: ['xato', 'chip-bad'], canceled: ['bekor', 'chip-bad'] };
const WD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
export default async function Ig({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams;
  const tab = TABS.find(t => t[0] === sp?.s) ? sp.s : 'q', view = sp?.v === 'cal' ? 'cal' : 'list';
  const [{ data: p }, { data: others }, { data: all }] = await Promise.all([db().from('projects').select('*').eq('id', id).maybeSingle(),
    db().from('projects').select('id,name,ig_username,ig_user_id').neq('id', id).not('ig_user_id', 'is', null).order('created_at'),
    db().from('ig_posts').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(500)]);
  if (!p) notFound();
  const posts = all || [], at = (x: any) => x.scheduled_at || x.created_at;
  const of = (k: string) => posts.filter(x => TABS.find(t => t[0] === k)![2].includes(x.status));
  const list = of(tab).sort((a, b) => (tab === 'q' ? 1 : -1) * (Date.parse(at(a)) - Date.parse(at(b))));
  const path = `/p/${id}/instagram`;
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const file = fd.get('file') as File, caption = String(fd.get('caption') || ''), when = String(fd.get('at') || ''), mode = String(fd.get('mode'));
    const targets = Array.from(new Set([id, ...fd.getAll('also').map(String)]));
    if (!file?.size) redirect(path + '?err=' + q('Rasm tanlanmadi. JPEG fayl kerak.'));
    if (file.size > 4 * 1024 * 1024) redirect(path + '?err=' + q('Rasm 4 MB dan katta. Kichikroq faylni tanlang.'));
    if (mode === 'schedule' && !when) redirect(path + '?err=' + q('Rejalashtirish uchun sana va vaqtni tanlang.'));
    const name = `${id}/${Date.now()}.jpg`;
    const up = await db().storage.from('posts').upload(name, Buffer.from(await file.arrayBuffer()), { contentType: 'image/jpeg' });
    if (up.error) redirect(path + '?err=' + q(up.error.message));
    const url = db().storage.from('posts').getPublicUrl(name).data.publicUrl;
    const iso = mode === 'schedule' ? new Date(when + ':00+05:00').toISOString() : new Date().toISOString();
    const { data: rows, error } = await db().from('ig_posts').insert(targets.map(t => ({ project_id: t, caption, media_url: url, scheduled_at: iso, status: mode === 'draft' ? 'draft' : 'scheduled' }))).select('*');
    if (error) redirect(path + '?err=' + q(error.message));
    let ok = 0; if (mode === 'now') for (const r of rows || []) if (await publishPost(r)) ok++;
    revalidatePath('/', 'layout');
    const n = targets.length;
    redirect(path + (mode === 'now' ? `?s=${ok ? 'pub' : 'err'}&ok=` + q(`${n} ta akkauntdan ${ok} tasiga chiqdi.`) : mode === 'draft' ? '?s=draft&ok=' + q('Qoralama saqlandi.') : '?ok=' + q(`${n} ta akkaunt navbatiga qo'shildi.`)));
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
    revalidatePath('/', 'layout');
  }
  const m = /^\d{4}-\d{2}$/.test(sp?.m || '') ? sp.m : today().slice(0, 7);
  const [Y, M] = m.split('-').map(Number), first = `${m}-01`, dow = (new Date(Date.UTC(Y, M - 1, 1)).getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - dow));
  const pm = new Date(Date.UTC(Y, M - 2, 1)).toISOString().slice(0, 7), nm = new Date(Date.UTC(Y, M, 1)).toISOString().slice(0, 7);
  const byDay: Record<string, any[]> = {};
  for (const x of posts) (byDay[dayOf(at(x))] ||= []).push(x);
  const cur = (on: boolean) => (on ? { 'aria-current': 'true' as const } : {});
  return (<Shell project={p} active="ig" crumbs={[{ label: 'Instagram', href: '/instagram' }, { label: handle(p) }]}>
    <AcctTabs p={p} sub="instagram" kind="ig" /><Flash sp={sp} />
    <div className="head"><div><h1>{handle(p)}: postlar</h1><p>Joylash va rejalashtirish, vaqt Toshkent bo'yicha. Navbat har 5 daqiqada tekshiriladi.</p></div><Conn p={p} /></div>
    <details className="disc" open={!posts.length}><summary className="btn">Yangi post</summary>
      <form action={add} className="panel form">
        <div className="grid2"><label className="field"><span>Rasm</span><input type="file" name="file" accept="image/jpeg" required /><span className="help">JPEG, 4 MB gacha. Instagram 4:5 dan 1.91:1 gacha nisbatni qabul qiladi.</span></label>
          <label className="field"><span>Sana va vaqt</span><input type="datetime-local" name="at" min={today() + 'T00:00'} /><span className="help">Faqat «Rejalashtirish» tanlansa kerak.</span></label></div>
        <label className="field"><span>Matn</span><textarea name="caption" rows={4} placeholder="Post matni va heshteglar" /><span className="help">2 200 belgigacha, 30 ta heshteggacha.</span></label>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}><legend className="field" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2xs)' }}>Qachon</legend>
          <div className="choice"><label><input type="radio" name="mode" value="now" defaultChecked />Hozir joylash<small>darhol chiqadi</small></label>
            <label><input type="radio" name="mode" value="schedule" />Rejalashtirish<small>tanlangan vaqtda</small></label>
            <label><input type="radio" name="mode" value="draft" />Qoralama<small>keyin chiqarasiz</small></label></div></fieldset>
        {(others || []).length > 0 && <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2xs)' }}>Boshqa akkauntlarga ham</legend>
          <div className="checks">{others!.map(o => <label key={o.id}><input type="checkbox" name="also" value={o.id} />{handle(o)}</label>)}</div>
          <span className="help">Shu post {handle(p)} bilan birga belgilangan akkauntlarga ham bir xil vaqtda chiqadi.</span></fieldset>}
        <div><button type="submit" className="btn btn-p">Saqlash</button></div></form></details>
    <div className="sec-h">
      {view === 'list' ? <nav className="seg" aria-label="Holat">{TABS.map(([k, l]) => <a key={k} href={`?s=${k}`} {...cur(tab === k)}>{l} <span className="m cool" style={{ marginLeft: 6 }}>{of(k).length}</span></a>)}</nav>
        : <div className="row"><a className="btn btn-s" href={`?v=cal&m=${pm}`} >Oldingi oy</a><b style={{ fontWeight: 500, minWidth: '9rem', textAlign: 'center' }}>{new Date(Date.UTC(Y, M - 1, 1)).toLocaleDateString('uz', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b><a className="btn btn-s" href={`?v=cal&m=${nm}`} >Keyingi oy</a></div>}
      <nav className="seg" aria-label="Ko'rinish"><a href="?v=list" {...cur(view === 'list')}>Ro'yxat</a><a href="?v=cal" {...cur(view === 'cal')}>Kalendar</a></nav></div>
    {view === 'list' ? (list.length ? <div className="scroll"><table className="tbl stack"><thead><tr><th><span className="visually-hidden">Rasm</span></th><th>Matn</th><th>Vaqt</th><th>Holat</th><th><span className="visually-hidden">Amallar</span></th></tr></thead>
      <tbody>{list.map(x => <tr key={x.id}>
        <td>{x.media_url ? <img className="thumb" src={x.media_url} alt="" width={44} height={44} /> : <span className="thumb" style={{ display: 'block' }} />}</td>
        <td><div className="clip">{x.caption || <span className="muted">Matnsiz</span>}</div>{x.error && <div className="was bad">{x.error}</div>}</td>
        <td className="m cool" data-label="Vaqt">{dt(at(x))}</td><td><span className={'chip ' + (SL[x.status]?.[1] || '')}>{SL[x.status]?.[0] || x.status}</span></td>
        <td className="r"><div className="row" style={{ justifyContent: 'flex-end' }}>
          {['scheduled', 'draft', 'failed'].includes(x.status) && <Act action={act} fields={{ pid: x.id }} op="now" label="Hozir chiqarish" />}
          {['draft', 'canceled'].includes(x.status) && <Act action={act} fields={{ pid: x.id }} op="queue" label="Navbatga" />}
          {x.status === 'scheduled' && <Act action={act} fields={{ pid: x.id }} op="cancel" label="Bekor qilish" cls="btn-q" />}
          {x.status !== 'published' && <Act action={act} fields={{ pid: x.id }} op="del" label="O'chirish" confirm="Ha, o'chirish" />}</div></td></tr>)}</tbody></table></div>
      : <div className="empty"><b>{tab === 'q' ? 'Navbatda post yo\'q' : tab === 'pub' ? 'Hali chiqqan post yo\'q' : tab === 'draft' ? "Qoralama yo'q" : 'Xato yoki bekor qilingan post yo\'q'}</b><p>{tab === 'q' ? "«Yangi post» bilan rasm yuklang va vaqtini tanlang, u shu yerda navbatga turadi." : "Bu yerda shu holatdagi postlar ko'rinadi."}</p></div>)
      : <div className="cal" role="grid" aria-label="Postlar kalendari">{WD.map(w => <div key={w} className="wd" role="columnheader">{w}</div>)}{cells.map(d => <div key={d} role="gridcell" className={(d.slice(0, 7) !== m ? 'out' : '') + (d === today() ? ' today' : '')}>
        <span className="d">{Number(d.slice(8))}</span>{(byDay[d] || []).sort((a, b) => Date.parse(at(a)) - Date.parse(at(b))).map(x => <span key={x.id} className={'ev ' + x.status} title={`${hm(at(x))} ${SL[x.status]?.[0] || ''}: ${x.caption || ''}`}><span className="m">{hm(at(x))}</span> {(x.caption || 'Rasm').slice(0, 28)}{(x.caption || '').length > 28 ? '…' : ''}</span>)}</div>)}</div>}
    <p className="help">Highlight'ga qo'shish va musiqa API orqali mumkin emas, ular telefonda qilinadi.</p>
  </Shell>);
}
