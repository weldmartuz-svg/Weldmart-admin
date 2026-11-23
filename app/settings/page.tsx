import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, requireAuth, setSecret, graph } from '@/lib/s';
import Shell from '@/components/Shell';
import { Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
const K = [['META_TOKEN', 'Meta System User token', 'Business Manager → System users → Generate token'], ['META_APP_SECRET', 'Meta App Secret', "Webhook imzosini tekshirish uchun"], ['META_VERIFY_TOKEN', 'Webhook verify token', "O'zingiz o'ylab topgan istalgan so'z"]];
export default async function S({ searchParams }: any) {
  await requireAuth();
  const sp = await searchParams;
  const { data } = await db().from('app_settings').select('key,updated_at');
  const has = new Map((data || []).map(r => [r.key, r.updated_at]));
  let me = '';
  if (has.has('META_TOKEN')) { try { const r = await graph('me', { fields: 'id,name' }); me = `${r.name} (${r.id})`; } catch (e: any) { me = 'XATO: ' + e.message; } }
  async function save(fd: FormData) { 'use server'; await requireAuth(); for (const [k] of K) await setSecret(k, String(fd.get(k) || '').trim()); revalidatePath('/settings'); redirect('/settings?ok=1'); }
  return (<Shell active="set" crumbs={[{ label: 'Sozlamalar' }]}>
    <Flash sp={sp} />
    <div><h1>Sozlamalar</h1><p className="m">Meta kalitlari shifrlangan holda saqlanadi. Bo'sh qoldirilgan maydon eski qiymatni o'zgartirmaydi.</p></div>
    <form action={save} className="card form"><h3>Meta kalitlari</h3>
      {me && <p className={me.startsWith('XATO') ? 'alert' : 'okm'} style={{ margin: 0 }}>{me.startsWith('XATO') ? me : `Token ishlayapti: ${me}`}</p>}
      {K.map(([k, t, h]) => <label key={k}>{t} {has.has(k) && <span className="badge g">saqlangan</span>}
        <input name={k} type="text" className="secret" autoComplete="off" data-1p-ignore="true" data-lpignore="true" placeholder={has.has(k) ? "•••••• (almashtirish uchun yangisini kiriting)" : ''} /><span className="hint">{h}</span></label>)}
      <div><button className="btn p">Saqlash</button></div></form>
    <div className="card form"><h3>Webhook (komment va Direct real vaqtda)</h3>
      <p className="hint">Meta Developers → ilova → Webhooks → Instagram. Callback URL va yuqoridagi verify token'ni kiriting, <b>comments</b> va <b>messages</b> maydonlariga obuna bo'ling.</p>
      <div className="code">https://weldmartadmin12.vercel.app/api/meta/webhook</div></div>
  </Shell>);
}
