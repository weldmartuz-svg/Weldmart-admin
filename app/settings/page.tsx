import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, requireAuth, setSecret, secret, graph, tgApi } from '@/lib/s';
import { q } from '@/lib/ui';
import Shell from '@/components/Shell';
import { Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const BASE = 'https://weldmartadmin12.vercel.app';
const K = [['META_TOKEN', 'System user token', "Business Manager → Users → System users → Generate new token."], ['META_APP_SECRET', 'App secret', 'Ilova sozlamalari → Basic. Webhook imzosini tekshiradi.'], ['META_VERIFY_TOKEN', 'Webhook verify token', "O'zingiz o'ylab topgan istalgan so'z, Meta'dagi bilan bir xil bo'lsin."]];
const nofill = { autoComplete: 'off', 'data-1p-ignore': 'true', 'data-lpignore': 'true' } as any;
export default async function S({ searchParams }: any) {
  await requireAuth();
  const sp = await searchParams;
  const { data } = await db().from('app_settings').select('key');
  const has = new Set((data || []).map(r => r.key));
  let me = '', meErr = '', bot = '', hook: any = null, botErr = '';
  if (has.has('META_TOKEN')) { try { const r = await graph('me', { fields: 'id,name' }); me = r.name; } catch (e: any) { meErr = e.message; } }
  const bt = await secret('TELEGRAM_BOT_TOKEN');
  if (bt) { try { bot = (await tgApi(bt, 'getMe')).username; hook = await tgApi(bt, 'getWebhookInfo'); } catch (e: any) { botErr = e.message; } }
  async function saveMeta(fd: FormData) { 'use server'; await requireAuth(); for (const [k] of K) await setSecret(k, String(fd.get(k) || '').trim()); revalidatePath('/settings'); redirect('/settings?ok=1'); }
  async function saveBot(fd: FormData) {
    'use server'; await requireAuth();
    const t = String(fd.get('bot') || '').trim() || (await secret('TELEGRAM_BOT_TOKEN'));
    if (!/^\d+:[\w-]{30,}$/.test(t)) redirect('/settings?err=' + q("Bot token noto'g'ri ko'rinishda. @BotFather bergan to'liq tokenni kiriting (1234567890:AAH...)."));
    const s = crypto.randomBytes(24).toString('hex');
    let me: any;
    try {
      me = await tgApi(t, 'getMe');
      await tgApi(t, 'setWebhook', { url: `${BASE}/api/telegram/webhook`, secret_token: s, allowed_updates: ['message', 'channel_post'], drop_pending_updates: true });
      await tgApi(t, 'setMyCommands', { commands: [{ command: 'holat', description: 'Ulangan akkauntlar va navbat' }, { command: 'stop', description: 'Shu chatni uzish' }] });
    } catch (e: any) { redirect('/settings?err=' + q(e.message)); }
    await setSecret('TELEGRAM_BOT_TOKEN', t); await setSecret('TG_WEBHOOK_SECRET', s);
    revalidatePath('/', 'layout'); redirect('/settings?ok=' + q(`@${me.username} ulandi. Endi har bir loyiha sozlamalaridan chatga ulang.`));
  }
  return (<Shell active="set" crumbs={[{ label: 'Sozlamalar' }]}>
    <Flash sp={sp} />
    <div className="head"><div><h1>Sozlamalar</h1><p>Kalitlar bazada shifrlangan holda saqlanadi va brauzerga chiqmaydi. Bo'sh qoldirilgan maydon eski qiymatni o'zgartirmaydi.</p></div></div>

    <form action={saveMeta} className="panel form" autoComplete="off"><div className="sec-h"><h2>Meta: Instagram va Facebook reklama</h2>
      {me ? <span className="chip chip-ok">token ishlayapti: {me}</span> : meErr ? <span className="chip chip-bad">token xato</span> : <span className="chip">token yo'q</span>}</div>
      {meErr && <p className="note note-bad">{meErr}</p>}
      {K.map(([k, t, h]) => <label key={k} className="field"><span>{t}{has.has(k) ? ' (saqlangan)' : ''}</span><input name={k} type="text" className="masked" placeholder={has.has(k) ? 'Almashtirish uchun yangisini kiriting' : ''} {...nofill} /><span className="help">{h}</span></label>)}
      <p className="help">Kerakli ruxsatlar: instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_messages, pages_show_list, pages_read_engagement, ads_read, business_management. System userga sahifalar, Instagram akkauntlar va reklama kabinetlarini Assets bo'limida biriktiring.</p>
      <div><button type="submit" className="btn btn-p">Saqlash</button></div></form>

    <form action={saveBot} className="panel form" autoComplete="off"><div className="sec-h"><h2>Telegram bot</h2>
      {bot ? <span className="chip chip-ok">@{bot}</span> : botErr ? <span className="chip chip-bad">xato</span> : <span className="chip">ulanmagan</span>}</div>
      {botErr && <p className="note note-bad">{botErr}</p>}
      <p className="muted">Bitta bot hamma loyihalarga xizmat qiladi: yangi komment, Direct va post holatlari kerakli chat yoki guruhga boradi. @BotFather'da /newbot buyrug'i bilan bot yarating va tokenini shu yerga kiriting.</p>
      <label className="field"><span>Bot token{bt ? ' (saqlangan)' : ''}</span><input name="bot" type="text" className="masked" placeholder={bt ? 'Almashtirish uchun yangisini kiriting' : '1234567890:AAH...'} {...nofill} /><span className="help">Saqlanganda webhook avtomatik o'rnatiladi.</span></label>
      {hook && <dl className="readings"><div><dt>Webhook</dt><dd className="m cool" style={{ overflowWrap: 'anywhere' }}>{hook.url || "o'rnatilmagan"}</dd></div><div><dt>Kutilayotgan xabarlar</dt><dd className="reading">{hook.pending_update_count || 0}</dd></div>
        {hook.last_error_message && <div><dt>Oxirgi xato</dt><dd className="bad">{hook.last_error_message}</dd></div>}</dl>}
      <div><button type="submit" className="btn">{bt ? 'Qayta ulash' : 'Botni ulash'}</button></div></form>

    <section className="panel"><h2>Meta webhook</h2><p className="muted">Meta Developers → ilova → Webhooks → Instagram. Quyidagi manzil va verify token'ni kiriting, comments va messages maydonlariga obuna bo'ling.</p><div className="code">{BASE}/api/meta/webhook</div></section>
  </Shell>);
}
