import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, graph, secret, enc, dec, tg } from '@/lib/s';
import { q } from '@/lib/ui';
import Shell from '@/components/Shell';
import { Flash } from '@/components/Bits';
import I from '@/components/Icon';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export default async function PS({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams;
  const { data: p } = await db().from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const token = !!(await secret('META_TOKEN'));
  let pages: any[] = [], ads: any[] = [], merr = '';
  if (token) {
    try { pages = (await graph('me/accounts', { fields: 'id,name,instagram_business_account{id,username}', limit: '100' })).data || []; } catch (e: any) { merr = e.message; }
    try { ads = (await graph('me/adaccounts', { fields: 'id,name,account_status', limit: '100' })).data || []; } catch (e: any) { merr ||= e.message; }
  }
  const igs = pages.filter(x => x.instagram_business_account);
  const igCur = igs.find(x => x.instagram_business_account.id === p.ig_user_id), adCur = ads.find(x => x.id === p.ad_account_id);
  const path = `/p/${id}/settings`;
  async function save(fd: FormData) {
    'use server'; await requireAuth();
    const f = (k: string) => String(fd.get(k) || '').trim();
    const u: any = { name: f('name') || p!.name, kind: f('kind') === 'target' ? 'target' : 'kontent', tg_chat_id: f('tg_chat_id') || null };
    const igsel = f('igsel');
    if (igsel && igsel !== 'manual') { const [pg, ig, un] = igsel.split('|'); u.fb_page_id = pg; u.ig_user_id = ig; u.ig_username = un || null; }
    else {
      const ig = f('ig_user_id');
      if (ig && !/^\d{6,}$/.test(ig)) redirect(path + '?err=' + q("Instagram User ID faqat raqamlardan iborat (username emas). Ro'yxatdan tanlang yoki raqamli ID kiriting."));
      u.ig_user_id = ig || null; u.fb_page_id = f('fb_page_id') || null; u.ig_username = f('ig_username').replace(/^@/, '') || null;
    }
    const adsel = f('adsel'), ad = adsel && adsel !== 'manual' ? adsel : f('ad_account_id');
    u.ad_account_id = ad ? (ad.startsWith('act_') ? ad : 'act_' + ad) : null;
    const t = f('tg_bot_token');
    if (t) { if (!/^\d+:[\w-]{30,}$/.test(t)) redirect(path + '?err=' + q("Telegram bot token noto'g'ri ko'rinishda (masalan 1234567890:AAH...)")); u.tg_bot_token = enc(t); }
    if (fd.get('tg_clear')) u.tg_bot_token = null;
    const { error } = await db().from('projects').update(u).eq('id', id);
    if (error) redirect(path + '?err=' + q(error.message));
    revalidatePath(path); redirect(path + '?ok=1');
  }
  async function test() {
    'use server'; await requireAuth();
    const { data: x } = await db().from('projects').select('name,tg_bot_token,tg_chat_id').eq('id', id).single();
    let m = '?ok=' + q('Sinov xabari Telegramga yuborildi');
    try { if (!x?.tg_bot_token || !x.tg_chat_id) throw new Error('Avval bot token va chat ID ni saqlang'); await tg(dec(x.tg_bot_token), x.tg_chat_id, `✅ Weldmart Admin: «${x.name}» loyihasi Telegramga ulandi`); } catch (e: any) { m = '?err=' + q(e.message); }
    redirect(path + m);
  }
  async function del(fd: FormData) {
    'use server'; await requireAuth();
    if (String(fd.get('confirm') || '').trim() !== p!.name) redirect(path + '?err=' + q('Tasdiqlash uchun loyiha nomini aynan yozing'));
    await db().from('projects').delete().eq('id', id); redirect('/');
  }
  const nofill = { autoComplete: 'off', 'data-1p-ignore': 'true', 'data-lpignore': 'true' } as any;
  return (<Shell project={p} active="pset" crumbs={[{ label: p.name, href: `/p/${id}` }, { label: 'Sozlamalar' }]}>
    <Flash sp={sp} />
    <div><h1>Loyiha sozlamalari</h1><p className="m">Akkauntlarni ulash: Instagram, Meta reklama kabineti va Telegram xabarlar.</p></div>
    {!token && <div className="alert">Meta token kiritilmagan — akkauntlar ro'yxati chiqmaydi. Avval <a href="/settings" style={{ textDecoration: 'underline' }}>Sozlamalar</a> sahifasiga tokenni kiriting yoki ID larni qo'lda yozing.</div>}
    {merr && <div className="alert">Meta: {merr}</div>}
    <form action={save} className="form" autoComplete="off">
      <div className="card form"><h3>Asosiy</h3>
        <label>Loyiha nomi<input name="name" defaultValue={p.name} {...nofill} /></label>
        <div className="seg"><label><input type="radio" name="kind" value="kontent" defaultChecked={p.kind !== 'target'} />Kontent<small>Instagram postlar, avtojavob</small></label>
          <label><input type="radio" name="kind" value="target" defaultChecked={p.kind === 'target'} />Target<small>Meta reklama statistikasi</small></label></div></div>
      <div className="card form"><h3><span className="row"><I n="ig" />Instagram {p.ig_user_id ? <span className="badge g">ulangan</span> : <span className="badge">ulanmagan</span>}</span></h3>
        {igs.length > 0 && <label>Akkauntni tanlang<select name="igsel" defaultValue={igCur ? `${igCur.id}|${igCur.instagram_business_account.id}|${igCur.instagram_business_account.username}` : 'manual'}>
          <option value="manual">— Qo'lda kiritish —</option>
          {igs.map(x => <option key={x.id} value={`${x.id}|${x.instagram_business_account.id}|${x.instagram_business_account.username}`}>@{x.instagram_business_account.username} · {x.name}</option>)}</select></label>}
        <div className="fg"><label>Instagram User ID (raqam)<input name="ig_user_id" defaultValue={p.ig_user_id || ''} placeholder="17841400000000000" inputMode="numeric" {...nofill} /></label>
          <label>Username<input name="ig_username" defaultValue={p.ig_username || ''} placeholder="weldmartuz" {...nofill} /></label>
          <label>Facebook Page ID<input name="fb_page_id" defaultValue={p.fb_page_id || ''} {...nofill} /></label></div>
        <p className="hint">Ro'yxatda tanlasangiz qo'lda kiritilgan maydonlar e'tiborga olinmaydi. Instagram akkaunt Business/Creator bo'lishi va Facebook sahifaga bog'langan bo'lishi kerak.</p></div>
      <div className="card form"><h3><span className="row"><I n="meta" />Meta reklama kabineti {p.ad_account_id ? <span className="badge g">ulangan</span> : <span className="badge">ulanmagan</span>}</span></h3>
        {ads.length > 0 && <label>Kabinetni tanlang<select name="adsel" defaultValue={adCur ? adCur.id : 'manual'}><option value="manual">— Qo'lda / yo'q —</option>{ads.map(x => <option key={x.id} value={x.id}>{x.name} · {x.id}</option>)}</select></label>}
        <label>Reklama kabineti ID<input name="ad_account_id" defaultValue={p.ad_account_id || ''} placeholder="act_1234567890" {...nofill} /></label></div>
      <div className="card form"><h3><span className="row"><I n="send" />Telegram xabarlar {p.tg_bot_token && p.tg_chat_id ? <span className="badge g">ulangan</span> : <span className="badge">ulanmagan</span>}</span></h3>
        <div className="fg"><label>Bot token {p.tg_bot_token && <span className="badge g">saqlangan</span>}<input name="tg_bot_token" type="text" className="secret" placeholder={p.tg_bot_token ? '•••••• (almashtirish uchun kiriting)' : '1234567890:AAH...'} {...nofill} /></label>
          <label>Chat ID<input name="tg_chat_id" defaultValue={p.tg_chat_id || ''} placeholder="-1001234567890" {...nofill} /></label></div>
        <p className="hint">@BotFather'da bot yarating va tokenni oling. Botni guruh yoki kanalga qo'shib admin qiling; chat ID ni @userinfobot yoki @getidsbot orqali bilasiz.</p>
        {p.tg_bot_token && <label className="row" style={{ display: 'flex', color: 'var(--tx)' }}><input type="checkbox" name="tg_clear" />Bot tokenni o'chirish</label>}</div>
      <div className="row"><button className="btn p">Saqlash</button></div>
    </form>
    <form action={test}><button className="btn"><I n="send" s={14} />Telegramga sinov xabari</button></form>
    <form action={del} className="card form" style={{ borderColor: 'rgba(240,112,112,.35)' }}><h3 className="r">Loyihani o'chirish</h3>
      <p className="hint">Loyiha, uning postlari va avtojavob qoidalari butunlay o'chadi. Tasdiqlash uchun «{p.name}» deb yozing.</p>
      <div className="row"><input name="confirm" style={{ maxWidth: 280 }} {...nofill} /><button className="btn d">O'chirish</button></div></form>
  </Shell>);
}
