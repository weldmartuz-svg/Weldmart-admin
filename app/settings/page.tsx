import crypto from 'crypto';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, requireAuth, setSecret, secret, graph } from '@/lib/s';
import Shell from '@/components/Shell';
import { Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const BASE = 'https://weldmartadmin12.vercel.app';
const nofill = { autoComplete: 'off', 'data-1p-ignore': 'true', 'data-lpignore': 'true' } as any;
export default async function S({ searchParams }: any) {
  await requireAuth();
  const sp = await searchParams;
  const { data } = await db().from('app_settings').select('key');
  const has = new Set((data || []).map(r => r.key));
  let me = '', meErr = '';
  if (has.has('META_TOKEN')) { try { me = (await graph('me', { fields: 'id,name' })).name; } catch (e: any) { meErr = e.message; } }
  let verify = await secret('META_VERIFY_TOKEN');
  if (!verify) { verify = 'weldmart-' + crypto.randomBytes(8).toString('hex'); await setSecret('META_VERIFY_TOKEN', verify); }
  async function saveToken(fd: FormData) { 'use server'; await requireAuth(); await setSecret('META_TOKEN', String(fd.get('META_TOKEN') || '').trim()); revalidatePath('/', 'layout'); redirect('/settings?ok=1'); }
  async function saveSecret(fd: FormData) { 'use server'; await requireAuth(); await setSecret('META_APP_SECRET', String(fd.get('META_APP_SECRET') || '').trim()); revalidatePath('/settings'); redirect('/settings?ok=1'); }
  return (<Shell active="set" crumbs={[{ label: 'Sozlamalar' }]}>
    <Flash sp={sp} />
    <div className="head"><div><h1>Sozlamalar</h1><p>Kalitlar bazada shifrlangan holda saqlanadi va brauzerga chiqmaydi.</p></div></div>

    <form action={saveToken} className="panel form" autoComplete="off"><div className="sec-h"><h2>Meta token</h2>
      {me ? <span className="chip chip-ok">ishlayapti: {me}</span> : meErr ? <span className="chip chip-bad">xato</span> : <span className="chip">kiritilmagan</span>}</div>
      {meErr && <p className="note note-bad">{meErr}</p>}
      <p className="muted">Instagram postlar, avtojavob va Meta Ads Manager statistikasi uchun yagona kerakli kalit.</p>
      <label className="field"><span>System user token{has.has('META_TOKEN') ? ' (saqlangan)' : ''}</span><input name="META_TOKEN" type="text" className="masked" required placeholder={has.has('META_TOKEN') ? 'Almashtirish uchun yangisini kiriting' : 'EAAG...'} {...nofill} /><span className="help">business.facebook.com → Sozlamalar → Foydalanuvchilar → System users → Generate new token.</span></label>
      <div><button type="submit" className="btn btn-p">Saqlash</button></div></form>

    <details className="disc"><summary className="btn">Real vaqtda komment va Direct (ixtiyoriy)</summary>
      <section className="panel form">
        <p className="muted">Bu sozlamasiz ham hammasi ishlaydi: avtojavob kommentlarni har 5 daqiqada o'zi tekshiradi. Agar kommentlar va Direct'lar «Xabarlar» bo'limiga va Telegram'ga darhol tushishini xohlasangiz, shu uch qadamni bajaring.</p>
        <ol className="steps">
          <li><b>App secret</b>ni oling: developers.facebook.com → My Apps → ilovangiz → App settings → Basic → «App secret» yonidagi Show. Pastdagi maydonga qo'ying.</li>
          <li>O'sha ilovada Webhooks → Instagram → Subscribe. «Callback URL» va «Verify token» ga quyidagi ikki qatorni nusxalang.</li>
          <li>Ro'yxatdan <span className="m">comments</span> va <span className="m">messages</span> ga obuna bo'ling.</li></ol>
        <div className="grid2"><div className="field"><span>Callback URL</span><div className="code">{BASE}/api/meta/webhook</div></div>
          <div className="field"><span>Verify token</span><div className="code">{verify}</div><span className="help">Avtomatik yaratildi, o'ylab topish shart emas.</span></div></div>
        <form action={saveSecret} className="form" autoComplete="off"><label className="field"><span>App secret{has.has('META_APP_SECRET') ? ' (saqlangan)' : ''}</span><input name="META_APP_SECRET" type="text" className="masked" required {...nofill} /><span className="help" /></label>
          <div><button type="submit" className="btn">Saqlash</button></div></form>
      </section></details>

    <section className="panel"><div className="sec-h"><h2>Telegram botlar</h2></div><p className="muted">Botlar endi alohida bo'limda: har biri o'z tabida, statistikasi, chatlari va xabar yuborish bilan.</p><div><Link className="btn" href="/telegram">Telegram bo'limiga o'tish</Link></div></section>
  </Shell>);
}
