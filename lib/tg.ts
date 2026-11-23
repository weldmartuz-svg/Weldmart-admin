import { db, dec, secret, tgApi } from './s';
export async function getBot(id: string) {
  const { data } = await db().from('telegram_bots').select('*').eq('id', id).maybeSingle();
  return data ? { ...data, tok: dec(data.token) } : null;
}
export async function listBots() {
  const { data } = await db().from('telegram_bots').select('id,name,username,created_at').order('created_at');
  return data || [];
}
export async function botSend(bot: any, chat: string, text: string) {
  try {
    await tgApi(bot.tok, 'sendMessage', { chat_id: chat, text });
    await db().from('telegram_messages').insert({ bot_id: bot.id, chat_id: chat, direction: 'out', text });
    return true;
  } catch (e: any) {
    if (/blocked|deactivated|kicked|chat not found/i.test(e.message)) await db().from('telegram_chats').update({ status: 'blocked' }).eq('bot_id', bot.id).eq('chat_id', chat);
    throw e;
  }
}
export async function botFor(p: any) {
  if (p?.tg_bot_id) { const b = await getBot(p.tg_bot_id); if (b) return b; }
  const own = dec(p?.tg_bot_token); if (own) return { id: null, tok: own };
  const { data } = await db().from('telegram_bots').select('id').order('created_at').limit(1).maybeSingle();
  if (data) return getBot(data.id);
  const legacy = await secret('TELEGRAM_BOT_TOKEN'); return legacy ? { id: null, tok: legacy } : null;
}
export const BASE = 'https://weldmartadmin12.vercel.app';
export async function hookUp(id: string, tok: string, secret: string) {
  await tgApi(tok, 'setWebhook', { url: `${BASE}/api/telegram/${id}`, secret_token: secret, allowed_updates: ['message', 'channel_post', 'my_chat_member'] });
  await tgApi(tok, 'setMyCommands', { commands: [{ command: 'start', description: 'Boshlash' }, { command: 'holat', description: 'Ulangan akkauntlar va navbat' }] });
}
