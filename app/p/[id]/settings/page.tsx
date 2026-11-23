import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, graph, secret, enc, tg } from '@/lib/s';
import { q, handle } from '@/lib/ui';
import Shell from '@/components/Shell';
import { Flash, Confirm, Act } from '@/components/Bits';
import { AcctTabs } from '@/components/Tabs';
import { botFor, botSend } from '@/lib/tg';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const nofill = { autoComplete: 'off', 'data-1p-ignore': 'true', 'data-lpignore': 'true' } as any;
export default async function PS({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams;
  const { data: p } = await db().from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const token = !!(await secret('META_TOKEN'));
  let pages: any[] = [], ads: any[] = [], merr = '';
  if (token) {
    const [a, b] = await Promise.allSettled([graph('me/accounts', { fields: 'id,name,instagram_business_account{id,username}', limit: '100' }), graph('me/adaccounts', { fields: 'id,name', limit: '100' })]);
    if (a.status === 'fulfilled') pages = a.value.data || []; else merr = String(a.reason?.message || a.reason);
    if (b.status === 'fulfilled') ads = b.value.data || []; else merr ||= String(b.reason?.message || b.reason);
  }
  const igs = pages.filter(x => x.instagram_business_account);
  const { data: bots } = await db().from('telegram_bots').select('id,name,username').order('created_at');
  const selBot = (bots || []).find(b => b.id === (sp?.bot || p.tg_bot_id)) || (bots || [])[0];
  const botName = selBot?.username || '';
  const isAd = p.kind === 'target' && !p.ig_user_id;
  const path = `/p/${id}/settings`;
  async function save(fd: FormData) {
    'use server'; await requireAuth();
    const f = (k: string) => String(fd.get(k) || '').trim();
    const u: any = { name: f('name') || p!.name, kind: f('kind') === 'target' ? 'target' : 'kontent' };
    const igsel = f('igsel');
    if (igsel && igsel !== 'manual') { const [pg, ig, un] = igsel.split('|'); u.fb_page_id = pg; u.ig_user_id = ig; u.ig_username = un || null; }
    else if (igsel === 'manual' || !igs.length) {
      const ig = f('ig_user_id');
      if (ig && !/^\d{6,}$/.test(ig)) redirect(path + '?err=' + q("Instagram ID faqat raqamlardan iborat bo'ladi, username emas. Ro'yxatdan tanlang yoki raqamli ID kiriting."));
      u.ig_user_id = ig || null; u.fb_page_id = f('fb_page_id') || null; u.ig_username = f('ig_username').replace(/^@/, '') || null;
    }
    const adsel = f('adsel'), ad = adsel && adsel !== 'manual' ? adsel : f('ad_account_id');
    u.ad_account_id = ad ? (ad.startsWith('act_') ? ad : 'act_' + ad) : null;
    const t = f('tg_bot_token');
    if (t) { if (!/^\d+:[\w-]{30,}$/.test(t)) redirect(path + '?err=' + q("Telegram bot token noto'g'ri ko'rinishda.")); u.tg_bot_token = enc(t); }
    if (fd.get('tg_clear')) u.tg_bot_token = null;
    if (fd.has('tg_chat_id')) u.tg_chat_id = f('tg_chat_id') || null;
    const { error } = await db().from('projects').update(u).eq('id', id);
    if (error) redirect(path + '?err=' + q(error.message.includes('ig_user_id') ? 'Bu Instagram akkaunt boshqa loyihaga ulangan.' : error.message));
    revalidatePath('/', 'layout'); redirect(path + '?ok=1');
  }
  async function tgAct(fd: FormData) {
    'use server'; await requireAuth();
    const op = String(fd.get('op'));
    const { data: x } = await db().from('projects').select('*').eq('id', id).single();
    let m = '';
    if (op === 'unlink') { await db().from('projects').update({ tg_chat_id: null }).eq('id', id); m = '?ok=' + q('Telegram chat uzildi.'); }
    if (op === 'test') { try { if (!x?.tg_chat_id) throw new Error("Avval chatga ulang."); const bb: any = await botFor(x); if (!bb) throw new Error('Bot sozlanmagan.'); const txt = `✅ Sinov: «${x.name}» Weldmart Admin bilan ulangan.`; if (bb.id) await botSend(bb, x.tg_chat_id, txt); else await tg(bb.tok, x.tg_chat_id, txt); m = '?ok=' + q('Sinov xabari yuborildi.'); } catch (e: any) { m = '?err=' + q(e.message); } }
    if (op === 'relink') { await db().from('projects').update({ tg_link_code: Math.random().toString(36).slice(2, 14) }).eq('id', id); m = '?ok=' + q('Yangi havola yaratildi, eskisi endi ishlamaydi.'); }
    revalidatePath(path); redirect(path + m);
  }
  async function del(fd: FormData) {
    'use server'; await requireAuth();
    if (String(fd.get('confirm') || '').trim() !== p!.name) redirect(path + '?err=' + q('Tasdiqlash uchun loyiha nomini aynan yozing.'));
    await db().from('projects').delete().eq('id', id); revalidatePath('/', 'layout'); redirect('/');
  }
  const igCur = igs.find(x => x.instagram_business_account.id === p.ig_user_id);
  return (<Shell project={p} active={isAd ? 'ads' : 'ig'} crumbs={[{ label: isAd ? 'Meta Ads Manager' : 'Instagram', href: isAd ? '/ads' : '/instagram' }, { label: isAd ? p.name : handle(p) }, { label: 'Sozlamalar' }]}>
    <AcctTabs p={p} sub="settings" kind={isAd ? 'ad' : 'ig'} /><Flash sp={sp} />
    <div className="head"><div><h1>{isAd ? p.name : handle(p)}: sozlamalar</h1><p>Instagram akkaunt, reklama kabineti va Telegram chat.</p></div></div>
    {!token && <p className="note">Meta token kiritilmagan, shuning uchun akkauntlar ro'yxati chiqmaydi. <a href="/settings">Sozlamalar</a> sahifasiga kiriting yoki ID larni qo'lda yozing.</p>}
    {merr && <p className="note note-bad">Meta: {merr}</p>}

    <section className="panel form"><div className="sec-h"><h2>Telegram</h2>{p.tg_chat_id ? <span className="chip chip-ok">ulangan</span> : <span className="chip">ulanmagan</span>}</div>
      {botName ? <>
        <p className="muted">Qaysi bot orqali va qaysi chatga xabar kelishini tanlang. Havolani bosing, Telegram ochiladi va bot chatni o'zi ulaydi.</p>
        {(bots || []).length > 1 && <nav className="seg" aria-label="Bot">{bots!.map(b => <a key={b.id} href={`?bot=${b.id}`} {...(selBot?.id === b.id ? { 'aria-current': 'true' } : {})}>@{b.username || b.name}</a>)}</nav>}
        <div className="row"><a className="btn" href={`https://t.me/${botName}?start=${p.tg_link_code}`} target="_blank" rel="noopener">Shaxsiy chatga ulash</a>
          <a className="btn" href={`https://t.me/${botName}?startgroup=${p.tg_link_code}`} target="_blank" rel="noopener">Guruhga qo'shish</a></div>
        {p.tg_chat_id && <p className="was">Ulangan chat ID <span className="m cool">{p.tg_chat_id}</span>{p.tg_bot_id && (bots || []).find(b => b.id === p.tg_bot_id) ? <> bot orqali <span className="amber">@{(bots || []).find(b => b.id === p.tg_bot_id)!.username}</span></> : null}</p>}
        <div className="row">{p.tg_chat_id && <><Act action={tgAct} fields={{}} op="test" label="Sinov xabari" /><Act action={tgAct} fields={{}} op="unlink" label="Chatni uzish" cls="btn-q" /></>}
          <Act action={tgAct} fields={{}} op="relink" label="Yangi havola" cls="btn-q" /></div>
      </> : <p className="note">Avval bot qo'shing: <a href="/telegram/new">Telegram → + Bot</a>.</p>}
    </section>

    <form action={save} className="form" autoComplete="off">
      <section className="panel form"><h2>Loyiha</h2>
        <label className="field"><span>Nomi</span><input name="name" defaultValue={p.name} {...nofill} /></label>
        <div className="choice"><label><input type="radio" name="kind" value="kontent" defaultChecked={p.kind !== 'target'} />Kontent<small>postlar va avtojavob</small></label>
          <label><input type="radio" name="kind" value="target" defaultChecked={p.kind === 'target'} />Reklama<small>Meta kabinet statistikasi</small></label></div></section>
      <section className="panel form"><div className="sec-h"><h2>Instagram</h2>{p.ig_user_id ? <span className="chip chip-ok">ulangan</span> : <span className="chip">ulanmagan</span>}</div>
        {igs.length > 0 ? <label className="field"><span>Akkaunt</span><select name="igsel" defaultValue={igCur ? `${igCur.id}|${igCur.instagram_business_account.id}|${igCur.instagram_business_account.username}` : 'manual'}>
          <option value="manual">Qo'lda kiritish</option>{igs.map(x => <option key={x.id} value={`${x.id}|${x.instagram_business_account.id}|${x.instagram_business_account.username}`}>@{x.instagram_business_account.username}, {x.name}</option>)}</select><span className="help">Ro'yxatdan tanlansa, pastdagi maydonlar hisobga olinmaydi.</span></label> : <input type="hidden" name="igsel" value="manual" />}
        <div className="grid2"><label className="field"><span>Instagram ID</span><input name="ig_user_id" defaultValue={p.ig_user_id || ''} inputMode="numeric" placeholder="17841400000000000" {...nofill} /><span className="help">Raqamli ID, username emas.</span></label>
          <label className="field"><span>Username</span><input name="ig_username" defaultValue={p.ig_username || ''} {...nofill} /><span className="help" /></label>
          <label className="field"><span>Facebook sahifa ID</span><input name="fb_page_id" defaultValue={p.fb_page_id || ''} inputMode="numeric" {...nofill} /><span className="help" /></label></div></section>
      <section className="panel form"><div className="sec-h"><h2>Reklama kabineti</h2>{p.ad_account_id ? <span className="chip chip-ok">ulangan</span> : <span className="chip">yo'q</span>}</div>
        {ads.length > 0 && <label className="field"><span>Kabinet</span><select name="adsel" defaultValue={ads.find(x => x.id === p.ad_account_id)?.id || 'manual'}><option value="manual">Qo'lda yoki yo'q</option>{ads.map(x => <option key={x.id} value={x.id}>{x.name}, {x.id}</option>)}</select></label>}
        <label className="field"><span>Kabinet ID</span><input name="ad_account_id" defaultValue={p.ad_account_id || ''} placeholder="act_1234567890" {...nofill} /><span className="help" /></label></section>
      <details className="disc"><summary className="btn btn-q">Telegram: alohida bot yoki chat ID (ixtiyoriy)</summary>
        <section className="panel form"><p className="muted">Odatda kerak emas. Faqat shu loyiha uchun boshqa bot ishlatmoqchi bo'lsangiz.</p>
          <div className="grid2"><label className="field"><span>Bot token{p.tg_bot_token ? ' (saqlangan)' : ''}</span><input name="tg_bot_token" type="text" className="masked" {...nofill} /><span className="help" /></label>
            <label className="field"><span>Chat ID</span><input name="tg_chat_id" defaultValue={p.tg_chat_id || ''} {...nofill} /><span className="help" /></label></div>
          {p.tg_bot_token && <label className="row"><input type="checkbox" name="tg_clear" />Alohida bot tokenni o'chirish</label>}</section></details>
      <div><button type="submit" className="btn btn-p">Saqlash</button></div>
    </form>

    <form action={del} className="panel form"><h2>Loyihani o'chirish</h2><p className="muted">Loyiha, uning postlari va avtojavob qoidalari butunlay o'chadi. Instagram akkauntning o'zi o'zgarmaydi. Tasdiqlash uchun «{p.name}» deb yozing.</p>
      <div className="row"><input name="confirm" aria-label="Loyiha nomi" style={{ maxWidth: '18rem' }} {...nofill} /><Confirm label="O'chirish"><button type="submit" className="btn btn-s btn-bad">Ha, o'chirish</button></Confirm></div></form>
  </Shell>);
}
