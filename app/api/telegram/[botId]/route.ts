import { db } from '@/lib/s';
import { getBot, botSend } from '@/lib/tg';
export const dynamic = 'force-dynamic';
const t = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export async function POST(req: Request, { params }: any) {
  const { botId } = await params;
  const bot = await getBot(botId);
  if (!bot || req.headers.get('x-telegram-bot-api-secret-token') !== bot.webhook_secret) return new Response('unauthorized', { status: 401 });
  const u = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  const cm = u.my_chat_member;
  if (cm?.chat) {
    const st = cm.new_chat_member?.status;
    await db().from('telegram_chats').upsert({ bot_id: bot.id, chat_id: String(cm.chat.id), type: cm.chat.type, title: cm.chat.title || null, username: cm.chat.username || null, first_name: cm.chat.first_name || null, status: st === 'kicked' || st === 'left' ? 'blocked' : 'active', last_seen: now });
    return new Response('ok');
  }
  const m = u.message || u.channel_post;
  if (!m?.chat?.id) return new Response('ok');
  const chat = String(m.chat.id);
  const { data: ex } = await db().from('telegram_chats').select('chat_id').eq('bot_id', bot.id).eq('chat_id', chat).maybeSingle();
  await db().from('telegram_chats').upsert({ bot_id: bot.id, chat_id: chat, type: m.chat.type, title: m.chat.title || null, username: m.chat.username || m.from?.username || null, first_name: m.chat.first_name || m.from?.first_name || null, status: 'active', last_seen: now, ...(ex ? {} : { started_at: now }) });
  if (m.text) await db().from('telegram_messages').insert({ bot_id: bot.id, chat_id: chat, direction: 'in', text: m.text.slice(0, 4000) });
  const say = (s: string) => botSend(bot, chat, s).catch(() => {});
  const [c0, arg] = (m.text || '').trim().split(/\s+/, 2), cmd = c0.split('@')[0].toLowerCase();
  if (cmd === '/start' && arg) {
    const { data: p } = await db().from('projects').select('id,name,ig_username').eq('tg_link_code', arg).maybeSingle();
    if (!p) await say("Havola eskirgan yoki noto'g'ri. Paneldan yangi havola oling.");
    else { await db().from('projects').update({ tg_chat_id: chat, tg_bot_id: bot.id }).eq('id', p.id); await say(`✅ ${p.ig_username ? '@' + p.ig_username : p.name} shu chatga ulandi.\nYangi komment, Direct va post holatlari shu yerga keladi.\n\n/holat: holat\n/stop: uzish`); }
  } else if (cmd === '/start') {
    await say(bot.welcome_text || 'Assalomu alaykum! Xabaringizni yozing, tez orada javob beramiz.');
  } else if (cmd === '/stop') {
    const { data } = await db().from('projects').update({ tg_chat_id: null }).eq('tg_chat_id', chat).eq('tg_bot_id', bot.id).select('name');
    if (data?.length) await say(`Uzildi: ${data.map(x => x.name).join(', ')}`);
  } else if (cmd === '/holat') {
    const { data: ps } = await db().from('projects').select('id,name,ig_username').eq('tg_chat_id', chat);
    if (ps?.length) {
      const { data: q } = await db().from('ig_posts').select('project_id,scheduled_at,caption').in('project_id', ps.map(p => p.id)).eq('status', 'scheduled').order('scheduled_at').limit(10);
      const lines = ps.map(p => `• ${p.ig_username ? '@' + p.ig_username : p.name}: navbatda ${(q || []).filter(x => x.project_id === p.id).length} ta`);
      const next = (q || []).slice(0, 5).map(x => `${t(x.scheduled_at)}  ${(x.caption || '').slice(0, 40)}`);
      await say(`Ulangan akkauntlar:\n${lines.join('\n')}${next.length ? '\n\nKeyingi postlar:\n' + next.join('\n') : ''}`);
    }
  }
  return new Response('ok');
}
