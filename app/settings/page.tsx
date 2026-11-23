import { revalidatePath } from 'next/cache';
import { db, requireAuth, setSecret } from '@/lib/s';
export const dynamic = 'force-dynamic';
const K = [['META_TOKEN', 'Meta System User token'], ['META_APP_SECRET', 'Meta App Secret'], ['META_VERIFY_TOKEN', 'Webhook verify token (o\'zingiz o\'ylab toping)']];
export default async function S() {
  await requireAuth();
  const { data } = await db().from('app_settings').select('key');
  const has = new Set((data || []).map(r => r.key));
  async function save(fd: FormData) { 'use server'; await requireAuth(); for (const [k] of K) await setSecret(k, String(fd.get(k) || '').trim()); revalidatePath('/settings'); }
  return (<form action={save} className="c"><h2>Meta kalitlari</h2>
    <p className="m">Kalitlar shifrlangan holda saqlanadi. Bo'sh qoldirsangiz eski qiymat o'zgarmaydi. Vercel env'dagi qiymat zaxira sifatida ishlaydi.</p>
    {K.map(([k, t]) => <div key={k}><label>{t} {has.has(k) ? '✅ saqlangan' : ''}</label><input name={k} type="password" placeholder={has.has(k) ? '•••••• (o\'zgartirish uchun yangisini kiriting)' : ''} autoComplete="off" /></div>)}
    <p className="m">Webhook manzili: <code>/api/meta/webhook</code></p><button>Saqlash</button></form>);
}
