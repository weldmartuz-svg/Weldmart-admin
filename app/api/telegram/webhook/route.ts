import { db, secret, tg } from '@/lib/s';
export const dynamic = 'force-dynamic';
const HELP = "Weldmart Admin boti.\n\nLoyihani ulash: panel → loyiha → Sozlamalar → Telegram → «Telegram'ga ulash».\n\n/holat — ulangan akkauntlar va navbatdagi postlar\n/stop — shu chatni uzish";
const t = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export async function POST(req: Request) {
  const sec = await secret('TG_WEBHOOK_SECRET');
  if (!sec || req.headers.get('x-telegram-bot-api-secret-token') !== sec) return new Response('unauthorized', { status: 401 });
  const u = await req.json().catch(() => ({}));
  const m = u.message || u.channel_post;
  if (!m?.text || !m.chat?.id) return new Response('ok');
  const token = await secret('TELEGRAM_BOT_TOKEN'), chat = String(m.chat.id);
  const say = (s: string) => tg(token, chat, s).catch(() => {});
  const [c0, arg] = m.text.trim().split(/\s+/, 2), cmd = c0.split('@')[0].toLowerCase();
  if (cmd === '/start' && arg) {
    const { data: p } = await db().from('projects').select('id,name,ig_username').eq('tg_link_code', arg).maybeSingle();
    if (!p) await say("Havola eskirgan yoki noto'g'ri. Paneldan yangi havola oling.");
    else { await db().from('projects').update({ tg_chat_id: chat }).eq('id', p.id); await say(`✅ «${p.name}»${p.ig_username ? ' (@' + p.ig_username + ')' : ''} shu chatga ulandi.\nYangi komment, Direct va post holatlari shu yerga keladi.\n\n/holat — holat\n/stop — uzish`); }
  } else if (cmd === '/stop') {
    const { data } = await db().from('projects').update({ tg_chat_id: null }).eq('tg_chat_id', chat).select('name');
    await say(data?.length ? `Uzildi: ${data.map(x => x.name).join(', ')}` : 'Bu chatga hech qaysi loyiha ulanmagan.');
  } else if (cmd === '/holat' || cmd === '/status') {
    const { data: ps } = await db().from('projects').select('id,name,ig_username').eq('tg_chat_id', chat);
    if (!ps?.length) await say("Bu chatga hech qaysi loyiha ulanmagan.\n\n" + HELP);
    else {
      const { data: q } = await db().from('ig_posts').select('project_id,scheduled_at,caption').in('project_id', ps.map(p => p.id)).eq('status', 'scheduled').order('scheduled_at').limit(10);
      const lines = ps.map(p => `• ${p.ig_username ? '@' + p.ig_username : p.name}: navbatda ${(q || []).filter(x => x.project_id === p.id).length} ta`);
      const next = (q || []).slice(0, 5).map(x => `${t(x.scheduled_at)} — ${(ps.find(p => p.id === x.project_id)?.ig_username || '')} ${(x.caption || '').slice(0, 40)}`);
      await say(`Ulangan akkauntlar:\n${lines.join('\n')}${next.length ? '\n\nKeyingi postlar:\n' + next.join('\n') : ''}`);
    }
  } else if (cmd.startsWith('/') || m.chat.type === 'private') await say(HELP);
  return new Response('ok');
}
