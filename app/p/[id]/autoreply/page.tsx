import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, graph } from '@/lib/s';
import { runRule } from '@/lib/ig';
import { dt, q, handle } from '@/lib/ui';
import Shell from '@/components/Shell';
import { AcctTabs } from '@/components/Tabs';

import { Conn, Flash, Confirm } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const kws = (s: string) => s.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
export default async function Ar({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams;
  const { data: p } = await db().from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const { data: rules } = await db().from('autoreply_rules').select('*').eq('project_id', id).order('created_at', { ascending: false });
  let media: any[] = [], merr = '';
  if (p.ig_user_id) { try { media = (await graph(`${p.ig_user_id}/media`, { fields: 'id,caption,timestamp', limit: '25' })).data || []; } catch (e: any) { merr = e.message; } }
  const path = `/p/${id}/autoreply`;
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const sel = String(fd.get('post') || ''), manual = String(fd.get('manual') || '').trim();
    const [mid, ...lab] = (manual ? manual + '|' : sel).split('|');
    const kw = kws(String(fd.get('kw') || '')), dm = String(fd.get('dm') || '').trim();
    if (!mid || !kw.length || !dm) redirect(path + '?err=' + q("Post, kalit so'z va Direct matni kerak."));
    const { error } = await db().from('autoreply_rules').insert({ project_id: id, ig_media_id: mid, post_label: lab.join('|') || null, keywords: kw, dm_text: dm, reply_text: String(fd.get('reply') || '').trim() || null });
    if (error) redirect(path + '?err=' + q(error.message));
    revalidatePath(path); redirect(path + '?ok=' + q("Qoida qo'shildi. Birinchi tekshiruv 5 daqiqa ichida."));
  }
  async function act(fd: FormData) {
    'use server'; await requireAuth();
    const rid = String(fd.get('rid')), op = String(fd.get('op'));
    const { data: r } = await db().from('autoreply_rules').select('*').eq('id', rid).eq('project_id', id).maybeSingle();
    let msg = '';
    if (r) {
      if (op === 'del') await db().from('autoreply_rules').delete().eq('id', rid);
      if (op === 'toggle') await db().from('autoreply_rules').update({ active: !r.active }).eq('id', rid);
      if (op === 'edit') { await db().from('autoreply_rules').update({ keywords: kws(String(fd.get('kw') || '')), dm_text: String(fd.get('dm') || r.dm_text), reply_text: String(fd.get('reply') || '').trim() || null }).eq('id', rid); msg = '?ok=1'; }
      if (op === 'check') { try { await runRule(r); msg = '?ok=' + q('Tekshirildi.'); } catch (e: any) { msg = '?err=' + q('Meta: ' + e.message); } }
    }
    revalidatePath(path); redirect(path + msg);
  }
  return (<Shell project={p} active="ig" crumbs={[{ label: 'Instagram', href: '/instagram' }, { label: handle(p), href: `/p/${id}/instagram` }, { label: 'Avtojavob' }]}>
    <AcctTabs p={p} sub="autoreply" kind="ig" /><Flash sp={sp} />
    <div className="head"><div><h1>{handle(p)}: avtojavob</h1><p>Postga kalit so'z bilan komment yozilsa, o'sha odamga Direct'da xabar boradi. Har 5 daqiqada tekshiriladi.</p></div><Conn p={p} /></div>
    <details className="disc" open={!(rules || []).length}><summary className="btn">Yangi qoida</summary>
      <form action={add} className="panel form">
        {merr && <p className="note note-bad">Postlar ro'yxati olinmadi: {merr}</p>}
        <label className="field"><span>Post</span>{media.length ? <select name="post" required><option value="">Postni tanlang</option>
          {media.map(m => { const l = `${(m.timestamp || '').slice(0, 10)}, ${(m.caption || 'matnsiz').slice(0, 60)}`; return <option key={m.id} value={`${m.id}|${l}`}>{l}</option>; })}</select>
          : <input name="manual" placeholder="Instagram media ID" inputMode="numeric" />}
          <span className="help">{media.length ? 'Oxirgi 25 ta post.' : 'Instagram ulangach postlar ro\'yxatdan tanlanadi.'}</span></label>
        <label className="field"><span>Kalit so'zlar</span><textarea name="kw" rows={2} required placeholder="katalog, каталог, narx" /><span className="help">Vergul bilan. Katta-kichik harf farq qilmaydi.</span></label>
        <div className="grid2"><label className="field"><span>Direct xabar</span><textarea name="dm" rows={4} required placeholder="Salom! Katalog shu havolada: ..." /><span className="help" /></label>
          <label className="field"><span>Kommentga javob</span><textarea name="reply" rows={4} placeholder="Direct'ga yubordik" /><span className="help">Ixtiyoriy. Bo'sh qolsa kommentga javob yozilmaydi.</span></label></div>
        <div><button type="submit" className="btn btn-p">Qo'shish</button></div></form></details>
    {(rules || []).length ? (rules || []).map(r => <article key={r.id} className="rule" aria-label={`Qoida: ${r.post_label || r.ig_media_id}`}>
      <div className="sec-h"><div className="row"><h2 style={{ fontSize: 'var(--text-md)', maxWidth: 'none' }}>{(r.post_label || 'Post ' + r.ig_media_id).slice(0, 70)}</h2><span className={'chip ' + (r.active ? 'chip-ok' : '')}>{r.active ? 'ishlayapti' : "to'xtatilgan"}</span><span className="was">Oxirgi tekshiruv <span className="m cool">{dt(r.last_checked)}</span></span></div>
        <form action={act} className="row"><input type="hidden" name="rid" value={r.id} />
          <button type="submit" className="btn btn-s" name="op" value="check">Hozir tekshirish</button>
          <button type="submit" className="btn btn-s btn-q" name="op" value="toggle">{r.active ? "To'xtatish" : 'Yoqish'}</button>
          <Confirm label="O'chirish"><button type="submit" className="btn btn-s btn-bad" name="op" value="del">Ha, o'chirish</button></Confirm></form></div>
      <div className="seams">
        <section><h3>Post</h3><p className="m cool">{r.ig_media_id}</p><p className="foot"><span className="m cool">{r.seen}</span> ta komment ko'rildi</p></section>
        <section><h3>Komment ichida</h3><div className="kw">{r.keywords.map((k: string) => <span key={k} className="chip">{k}</span>)}</div><p className="foot"><span className="m cool">{r.matched}</span> ta mos keldi</p></section>
        <section><h3>Direct xabar</h3><div className="bubble">{r.dm_text}</div><p className="foot"><span className="m cool">{r.sent}</span> ta yuborildi</p></section>
        <section><h3>Kommentga javob</h3>{r.reply_text ? <div className="bubble">{r.reply_text}</div> : <p className="muted">Javob yozilmaydi</p>}</section>
      </div>
      <details className="disc"><summary className="btn btn-s btn-q">Tahrirlash</summary>
        <form action={act} className="panel form"><input type="hidden" name="rid" value={r.id} /><input type="hidden" name="op" value="edit" />
          <label className="field"><span>Kalit so'zlar</span><textarea name="kw" rows={2} defaultValue={r.keywords.join(', ')} /></label>
          <div className="grid2"><label className="field"><span>Direct xabar</span><textarea name="dm" rows={4} defaultValue={r.dm_text} /></label>
            <label className="field"><span>Kommentga javob</span><textarea name="reply" rows={4} defaultValue={r.reply_text || ''} /></label></div>
          <div><button type="submit" className="btn btn-p">Saqlash</button></div></form></details>
    </article>) : null}
    <p className="help">Instagram qoidasi: komment egasiga Direct faqat komment yozilgandan keyin 7 kun ichida va bitta kommentga bir marta yuboriladi.</p>
  </Shell>);
}
