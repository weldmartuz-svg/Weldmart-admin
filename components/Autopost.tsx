import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, requireAuth, secret } from '@/lib/s';
import { writePost, publishTg, MODELS, fmtTimes, parseTimes } from '@/lib/claude';
import { dt, q } from '@/lib/ui';
import { Confirm } from './Bits';
const ST: Record<string, [string, string]> = { draft: ['qoralama', 'chip-acc'], scheduled: ['navbatda', 'chip-cool'], publishing: ['chiqmoqda', 'chip-cool'], published: ['chiqdi', 'chip-ok'], failed: ['xato', 'chip-bad'], canceled: ['bekor', ''] };
const F: [string, string, string[]][] = [['q', 'Navbatda', ['scheduled', 'publishing']], ['draft', 'Qoralama', ['draft']], ['pub', 'Chiqqan', ['published']], ['err', 'Xato yoki bekor', ['failed', 'canceled']]];
export default async function Autopost({ botId, chats, sp }: { botId: string; chats: any[]; sp: any }) {
  const path = `/telegram/${botId}`, back = (m: string) => `${path}?t=auto&${m}`;
  const [{ data: aps }, { data: posts }, key] = await Promise.all([
    db().from('telegram_autopost').select('*').eq('bot_id', botId).order('created_at'),
    db().from('telegram_posts').select('*').eq('bot_id', botId).order('scheduled_at', { ascending: false }).limit(200), secret('ANTHROPIC_API_KEY')]);
  const A = aps || [], P = posts || [];
  const targets = chats.filter(c => c.type !== 'private' && c.status === 'active');
  const name = (id: string) => { const c = chats.find(x => x.chat_id === id); return c?.title || (c?.username ? '@' + c.username : id); };
  const f = F.find(x => x[0] === sp?.pf) ? sp.pf : 'q';
  const list = P.filter(p => F.find(x => x[0] === f)![2].includes(p.status)).sort((a, b) => (f === 'q' || f === 'draft' ? 1 : -1) * (Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)));
  async function create(fd: FormData) {
    'use server'; await requireAuth();
    const chat = String(fd.get('chat') || ''), brief = String(fd.get('brief') || '').trim(), times = parseTimes(String(fd.get('times') || ''));
    if (!chat || brief.length < 20) redirect(back('err=' + q("Kanalni tanlang va yo'nalishni kamida bir-ikki gap bilan yozing.")));
    if (!times.length) redirect(back('err=' + q('Kamida bitta vaqt kiriting, masalan 09:00, 18:00.')));
    const { data: c } = await db().from('telegram_chats').select('title,username').eq('bot_id', botId).eq('chat_id', chat).maybeSingle();
    await db().from('telegram_autopost').insert({ bot_id: botId, chat_id: chat, chat_title: c?.title || c?.username || null, brief, times, mode: fd.get('mode') === 'review' ? 'review' : 'auto', model: String(fd.get('model') || MODELS[0][0]) });
    revalidatePath(path); redirect(back('ok=' + q("Avtopost yoqildi. Birinchi post navbatdagi vaqtdan oldin yoziladi.")));
  }
  async function apAct(fd: FormData) {
    'use server'; await requireAuth();
    const id = String(fd.get('id')), op = String(fd.get('op'));
    const { data: ap } = await db().from('telegram_autopost').select('*').eq('id', id).eq('bot_id', botId).maybeSingle();
    if (!ap) redirect(back(''));
    let m = '';
    if (op === 'toggle') await db().from('telegram_autopost').update({ active: !ap.active }).eq('id', id);
    if (op === 'del') await db().from('telegram_autopost').delete().eq('id', id);
    if (op === 'edit') { const times = parseTimes(String(fd.get('times') || '')); await db().from('telegram_autopost').update({ brief: String(fd.get('brief') || ap.brief).trim(), times: times.length ? times : ap.times, mode: fd.get('mode') === 'review' ? 'review' : 'auto', model: String(fd.get('model') || ap.model) }).eq('id', id); m = 'ok=1'; }
    if (op === 'write') {
      try { const text = await writePost(ap); await db().from('telegram_posts').insert({ autopost_id: id, bot_id: botId, chat_id: ap.chat_id, text, scheduled_at: new Date().toISOString(), status: 'draft' }); m = 'pf=draft&ok=' + q("Claude yangi post yozdi. Qoralamada ko'rib chiqing."); }
      catch (e: any) { m = 'err=' + q(e.message); }
    }
    revalidatePath(path); redirect(back(m));
  }
  async function postAct(fd: FormData) {
    'use server'; await requireAuth();
    const id = String(fd.get('id')), op = String(fd.get('op'));
    const { data: p } = await db().from('telegram_posts').select('*').eq('id', id).eq('bot_id', botId).maybeSingle();
    if (!p) redirect(back(''));
    let m = 'pf=' + (fd.get('pf') || 'q');
    if (op === 'save') await db().from('telegram_posts').update({ text: String(fd.get('text') || p.text).slice(0, 4000) }).eq('id', id);
    if (op === 'approve') await db().from('telegram_posts').update({ status: 'scheduled', scheduled_at: Date.parse(p.scheduled_at) < Date.now() ? new Date(Date.now() + 60000).toISOString() : p.scheduled_at }).eq('id', id);
    if (op === 'cancel') await db().from('telegram_posts').update({ status: 'canceled' }).eq('id', id);
    if (op === 'del') await db().from('telegram_posts').delete().eq('id', id);
    if (op === 'now') { const ok = await publishTg(p); m = ok ? 'pf=pub&ok=' + q('Kanalga chiqdi.') : 'pf=err&err=' + q('Chiqmadi, xato yozuvini ko\'ring.'); }
    revalidatePath(path); redirect(back(m));
  }
  const ModelPick = ({ v }: { v?: string }) => <div className="choice">{MODELS.map(([id, l, d]) => <label key={id}><input type="radio" name="model" value={id} defaultChecked={(v || MODELS[0][0]) === id} />{l}<small>{d}</small></label>)}</div>;
  const ModePick = ({ v }: { v?: string }) => <div className="choice"><label><input type="radio" name="mode" value="auto" defaultChecked={v !== 'review'} />Avtomatik<small>yozadi va o'zi chiqaradi</small></label><label><input type="radio" name="mode" value="review" defaultChecked={v === 'review'} />Ko'rib chiqib<small>qoralama, siz tasdiqlaysiz</small></label></div>;
  return <>
    {!key && <p className="note note-bad">Claude API kaliti kiritilmagan, shuning uchun post yozilmaydi. <Link href="/settings">Sozlamalar → Claude</Link></p>}
    {A.map(ap => <article key={ap.id} className="rule">
      <div className="sec-h"><div className="row"><h2 style={{ fontSize: 'var(--text-md)', maxWidth: 'none' }}>{ap.chat_title || name(ap.chat_id)}</h2>
        <span className={'chip ' + (ap.active ? 'chip-ok' : '')}>{ap.active ? 'ishlayapti' : "to'xtatilgan"}</span><span className="chip">{ap.mode === 'review' ? "ko'rib chiqib" : 'avtomatik'}</span>
        <span className="was">Har kuni <span className="m cool">{fmtTimes(ap.times)}</span></span></div>
        <form action={apAct} className="row"><input type="hidden" name="id" value={ap.id} />
          <button type="submit" className="btn btn-s" name="op" value="write">Hozir yozdirish</button>
          <button type="submit" className="btn btn-s btn-q" name="op" value="toggle">{ap.active ? "To'xtatish" : 'Yoqish'}</button>
          <Confirm label="O'chirish"><button type="submit" className="btn btn-s btn-bad" name="op" value="del">Ha, o'chirish</button></Confirm></form></div>
      <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{ap.brief}</p>
      <details className="disc"><summary className="btn btn-s btn-q">Tahrirlash</summary>
        <form action={apAct} className="panel form"><input type="hidden" name="id" value={ap.id} /><input type="hidden" name="op" value="edit" />
          <label className="field"><span>Yo'nalish</span><textarea name="brief" rows={6} defaultValue={ap.brief} /></label>
          <label className="field"><span>Vaqtlar (Toshkent)</span><input name="times" defaultValue={fmtTimes(ap.times)} /></label>
          <ModePick v={ap.mode} /><ModelPick v={ap.model} /><div><button type="submit" className="btn btn-p">Saqlash</button></div></form></details>
    </article>)}

    <details className="disc" open={!A.length}><summary className="btn">{A.length ? "Yana kanal qo'shish" : 'Avtopostni sozlash'}</summary>
      {targets.length ? <form action={create} className="panel form">
        <p className="muted">Claude siz yozgan yo'nalish bo'yicha post yozadi va belgilangan vaqtlarda kanalga chiqaradi. Oxirgi postlarni hisobga olib, mavzuni takrorlamaydi.</p>
        <label className="field"><span>Kanal yoki guruh</span><select name="chat" required><option value="">Tanlang</option>{targets.map(c => <option key={c.chat_id} value={c.chat_id}>{c.title || c.username || c.chat_id}</option>)}</select><span className="help">Bot kanalga admin sifatida qo'shilgan bo'lishi kerak.</span></label>
        <label className="field"><span>Yo'nalish</span><textarea name="brief" rows={7} required placeholder={"Weldmart: payvandlash apparatlari, elektrodlar va himoya vositalari do'koni, Toshkent.\nAuditoriya: ustalar va kichik ustaxonalar.\nMavzular: apparat tanlash, elektrod turlari, xavfsizlik, ustaxona maslahatlari, yangi mahsulotlar.\nOhang: do'stona, amaliy, ortiqcha reklamasiz.\nOxirida: Buyurtma uchun @weldmart_admin"} /><span className="help">Kim uchun, qaysi mavzular, qanday ohang va qanday aloqa ma'lumoti. Qancha aniq bo'lsa, postlar shuncha yaxshi.</span></label>
        <label className="field"><span>Vaqtlar (Toshkent)</span><input name="times" defaultValue="09:00, 18:00" /><span className="help">Vergul bilan. Masalan 08:30, 13:00, 20:30.</span></label>
        <ModePick /><ModelPick />
        <div><button type="submit" className="btn btn-p">Yoqish</button></div></form>
        : <div className="empty"><b>Kanal yoki guruh topilmadi</b><p>Botni kanalingizga admin qilib qo'shing (Kanal → Administratorlar → Admin qo'shish → botni toping, «Post joylash» ruxsati bilan). Qo'shilgach kanal shu ro'yxatda paydo bo'ladi.</p></div>}</details>

    {P.length > 0 && <section className="sec" aria-labelledby="tp-h"><div className="sec-h"><h2 id="tp-h">Postlar</h2>
      <nav className="seg" aria-label="Holat">{F.map(([k, l, s]) => <a key={k} href={`?t=auto&pf=${k}`} {...(f === k ? { 'aria-current': 'true' } : {})}>{l} <span className="m cool" style={{ marginLeft: 6 }}>{P.filter(p => s.includes(p.status)).length}</span></a>)}</nav></div>
      {list.length ? <div className="scroll"><table className="tbl stack"><thead><tr><th>Vaqt</th><th>Kanal</th><th>Holat</th><th>Matn</th><th><span className="visually-hidden">Amallar</span></th></tr></thead>
        <tbody>{list.map(p => <tr key={p.id}><td className="m cool">{dt(p.published_at || p.scheduled_at)}</td><td>{name(p.chat_id)}</td><td><span className={'chip ' + (ST[p.status]?.[1] || '')}>{ST[p.status]?.[0] || p.status}</span></td>
          <td style={{ minWidth: '20rem', maxWidth: '36rem' }}>
            <details><summary style={{ cursor: 'pointer' }}><span className="clip" style={{ display: 'inline-block', maxWidth: '30rem', verticalAlign: 'bottom' }}>{p.text.split('\n')[0]}</span></summary>
              {['draft', 'scheduled', 'failed'].includes(p.status) ? <form action={postAct} className="form" style={{ marginTop: 'var(--space-xs)' }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="pf" value={f} /><input type="hidden" name="op" value="save" /><textarea name="text" rows={10} defaultValue={p.text} /><div><button type="submit" className="btn btn-s">Matnni saqlash</button></div></form>
                : <div className="bubble" style={{ marginTop: 'var(--space-xs)' }}>{p.text}</div>}</details>
            {p.error && <div className="was bad">{p.error}</div>}</td>
          <td className="r"><form action={postAct} className="row" style={{ justifyContent: 'flex-end' }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="pf" value={f} />
            {p.status === 'draft' && <button type="submit" className="btn btn-s" name="op" value="approve">Tasdiqlash</button>}
            {['draft', 'scheduled', 'failed'].includes(p.status) && <button type="submit" className="btn btn-s" name="op" value="now">Hozir chiqarish</button>}
            {p.status === 'scheduled' && <button type="submit" className="btn btn-s btn-q" name="op" value="cancel">Bekor qilish</button>}
            {p.status !== 'published' && <Confirm label="O'chirish"><button type="submit" className="btn btn-s btn-bad" name="op" value="del">Ha</button></Confirm>}</form></td></tr>)}</tbody></table></div>
        : <div className="empty"><b>Bu holatda post yo'q</b><p>Avtomatik rejimda post vaqtidan taxminan 2 soat oldin, ko'rib chiqish rejimida bir kun oldin yoziladi.</p></div>}</section>}
  </>;
}
