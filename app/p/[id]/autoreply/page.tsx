import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, graph } from '@/lib/s';
import { runRule } from '@/lib/ig';
import { dt, q } from '@/lib/ui';
import Shell from '@/components/Shell';
import { ProjectBar, Flash } from '@/components/Bits';
import I from '@/components/Icon';
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
  if (p.ig_user_id) { try { media = (await graph(`${p.ig_user_id}/media`, { fields: 'id,caption,timestamp,media_type', limit: '25' })).data || []; } catch (e: any) { merr = e.message; } }
  const path = `/p/${id}/autoreply`;
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const sel = String(fd.get('post') || ''), manual = String(fd.get('manual') || '').trim();
    const [mid, ...lab] = (manual ? manual + '|' : sel).split('|');
    const kw = kws(String(fd.get('kw') || '')), dm = String(fd.get('dm') || '').trim();
    if (!mid || !kw.length || !dm) redirect(path + '?err=' + q("Post, kalit so'z va Direct matni majburiy"));
    const { error } = await db().from('autoreply_rules').insert({ project_id: id, ig_media_id: mid, post_label: lab.join('|') || null, keywords: kw, dm_text: dm, reply_text: String(fd.get('reply') || '').trim() || null });
    if (error) redirect(path + '?err=' + q(error.message));
    revalidatePath(path); redirect(path + '?ok=' + q("Qoida qo'shildi"));
  }
  async function act(fd: FormData) {
    'use server'; await requireAuth();
    const rid = String(fd.get('rid')), op = String(fd.get('op'));
    const { data: r } = await db().from('autoreply_rules').select('*').eq('id', rid).eq('project_id', id).maybeSingle();
    let msg = '';
    if (r) {
      if (op === 'del') await db().from('autoreply_rules').delete().eq('id', rid);
      if (op === 'toggle') await db().from('autoreply_rules').update({ active: !r.active }).eq('id', rid);
      if (op === 'edit') await db().from('autoreply_rules').update({ keywords: kws(String(fd.get('kw') || '')), dm_text: String(fd.get('dm') || r.dm_text), reply_text: String(fd.get('reply') || '').trim() || null }).eq('id', rid);
      if (op === 'check') { try { await runRule(r); msg = '?ok=' + q('Tekshirildi'); } catch (e: any) { msg = '?err=' + q('Meta: ' + e.message); } }
    }
    revalidatePath(path); redirect(path + msg);
  }
  return (<Shell project={p} active="ar" crumbs={[{ label: p.name, href: `/p/${id}` }, { label: 'Avtojavob' }]}>
    <ProjectBar p={p} /><Flash sp={sp} />
    <div className="ph"><div><h1>Avtojavob</h1><p className="m">Postga kalit so'z bilan komment yozilsa, o'sha odamga Direct'da avtomatik xabar boradi. Har 5 daqiqada tekshiriladi.</p></div>
      <details className="pop"><summary className="btn p"><I n="plus" s={15} />Yangi qoida</summary>
        <form action={add} className="popc" style={{ width: 'min(520px,92vw)' }}><b style={{ fontSize: 16 }}>Yangi qoida</b>
          {merr && <div className="alert">{merr}</div>}
          <label>Post<select name="post"><option value="">— Postni tanlang —</option>
            {media.map(m => { const l = `${(m.timestamp || '').slice(0, 16).replace('T', ' ')} · ${(m.caption || '').slice(0, 60)}`; return <option key={m.id} value={`${m.id}|${l}`}>{l}</option>; })}</select>
            {!media.length && <span className="hint">Postlar ro'yxati Instagram ulangach chiqadi. Hozircha post ID ni qo'lda kiriting:</span>}</label>
          {!media.length && <input name="manual" placeholder="Instagram media ID" />}
          <label>Kalit so'zlar (vergul bilan)<textarea name="kw" rows={2} placeholder="ai, ай, a.i, katalog" required /></label>
          <label>Direct xabar<textarea name="dm" rows={4} placeholder="Salom! Katalogni shu havoladan olasiz: ..." required /></label>
          <label>Kommentga javob (ixtiyoriy)<input name="reply" placeholder="Direct'ga yubordik ✅" /></label>
          <button className="btn p">Qo'shish</button></form></details></div>
    {(rules || []).length ? (rules || []).map(r => <div key={r.id} className="card rule">
      <div className="rh"><b>{p.ig_username ? '@' + p.ig_username : p.name}</b><span className={'badge ' + (r.active ? 'g' : 'w')}>{r.active ? 'Ishlayapti' : 'Pauzada'}</span><small>Oxirgi tekshiruv: {dt(r.last_checked)}</small></div>
      <div className="flow">
        <div className="fs"><h4><I n="play" s={12} />Post</h4><div>{r.post_label || r.ig_media_id}</div><div className="cnt"><b>{r.seen}</b>ta komment ko'rildi</div></div>
        <div className="fs"><h4><I n="hash" s={12} />Komment ichida</h4><div className="kw">{r.keywords.map((k: string) => <span key={k}>{k}</span>)}</div><div className="cnt"><b>{r.matched}</b>ta mos keldi</div></div>
        <div className="fs"><h4><I n="msg" s={12} />Direct xabar</h4><div className="bub">{r.dm_text}</div><div className="cnt"><b>{r.sent}</b>ta yuborildi</div></div>
        <div className="fs"><h4><I n="reply" s={12} />Kommentga javob</h4><div>{r.reply_text || <span className="mut">Javob yozilmaydi</span>}</div></div>
      </div>
      <form action={act} className="row"><input type="hidden" name="rid" value={r.id} />
        <button className="btn p" name="op" value="check">Hozir tekshirish</button>
        <button className="btn" name="op" value="toggle">{r.active ? "O'chirish (pauza)" : 'Yoqish'}</button>
        <button className="btn d" name="op" value="del">Qoidani o'chirish</button></form>
      <details className="inl"><summary className="btn sm" style={{ width: 'fit-content' }}>Tahrirlash</summary>
        <form action={act} className="form"><input type="hidden" name="rid" value={r.id} /><input type="hidden" name="op" value="edit" />
          <label>Kalit so'zlar<textarea name="kw" rows={2} defaultValue={r.keywords.join(', ')} /></label>
          <label>Direct xabar<textarea name="dm" rows={4} defaultValue={r.dm_text} /></label>
          <label>Kommentga javob<input name="reply" defaultValue={r.reply_text || ''} /></label><div><button className="btn p sm">Saqlash</button></div></form></details>
    </div>) : <div className="card"><p className="empty">Hali qoida yo'q. «Yangi qoida» tugmasi bilan qo'shing.</p></div>}
    <p className="hint">Instagram qoidasi: komment egasiga Direct faqat komment yozilgandan keyin 7 kun ichida va bitta kommentga bir marta yuboriladi.</p>
  </Shell>);
}
