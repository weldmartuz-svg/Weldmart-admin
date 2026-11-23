import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, requireAuth, enc, tgApi } from '@/lib/s';
import { q } from '@/lib/ui';
import { hookUp } from '@/lib/tg';
import Shell from '@/components/Shell';
import { BotTabs } from '@/components/Tabs';
import { Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export default async function NewBot({ searchParams }: any) {
  await requireAuth();
  const sp = await searchParams;
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const t = String(fd.get('token') || '').trim();
    if (!/^\d+:[\w-]{30,}$/.test(t)) redirect('/telegram/new?err=' + q("Token noto'g'ri ko'rinishda. @BotFather bergan to'liq qatorni kiriting."));
    const id = crypto.randomUUID(), secret = crypto.randomBytes(24).toString('hex');
    let me: any;
    try { me = await tgApi(t, 'getMe'); await hookUp(id, t, secret); } catch (e: any) { redirect('/telegram/new?err=' + q(e.message)); }
    const { error } = await db().from('telegram_bots').insert({ id, name: me.first_name, username: me.username, token: enc(t), webhook_secret: secret });
    if (error) redirect('/telegram/new?err=' + q(error.message));
    revalidatePath('/', 'layout'); redirect(`/telegram/${id}?ok=` + q(`@${me.username} ulandi.`));
  }
  return <Shell active="tg" crumbs={[{ label: 'Telegram', href: '/telegram' }, { label: "Bot qo'shish" }]}>
    <BotTabs tab="" /><Flash sp={sp} />
    <div className="head"><div><h1>Bot qo'shish</h1><p>Har bir bot alohida tabda: statistika, kelgan xabarlar, chatlar ro'yxati va xabar yuborish.</p></div></div>
    <div className="grid2" style={{ alignItems: 'start' }}>
      <form action={add} className="panel form" autoComplete="off"><h2>Bot token</h2>
        <label className="field"><span>Token</span><input name="token" type="text" className="masked" required autoComplete="off" data-1p-ignore="true" data-lpignore="true" placeholder="1234567890:AAH..." /><span className="help">Token bazada shifrlangan holda saqlanadi.</span></label>
        <div><button type="submit" className="btn btn-p">Botni ulash</button></div></form>
      <section className="panel"><h2>Tokenni qayerdan olaman</h2><ol className="steps"><li>Telegram'da <b>@BotFather</b> ni oching.</li><li><span className="m">/newbot</span> deb yozing.</li><li>Botga nom bering, keyin oxiri <span className="m">bot</span> bilan tugaydigan username bering.</li><li>BotFather yuborgan uzun qatorni (raqam, ikki nuqta va harflar) nusxalab shu yerga qo'ying.</li></ol></section>
    </div></Shell>;
}
