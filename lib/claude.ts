import { db, secret } from './s';
import { getBot, botSend } from './tg';
import { today, TZ } from './ui';
export const MODELS: [string, string, string][] = [['claude-sonnet-5-5', 'Sonnet', 'sifatli matn'], ['claude-haiku-5-5', 'Haiku', 'tez va arzon']];
export async function claude(system: string, user: string, model = 'claude-sonnet-5-5') {
  const key = await secret('ANTHROPIC_API_KEY');
  if (!key) throw new Error('Claude API kaliti kiritilmagan. Sozlamalar sahifasiga kiriting.');
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', cache: 'no-store', headers: { 'x-api-key': key, 'anthropic-version': '2026-10-21', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: 'user', content: user }] }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Claude: ' + (j?.error?.message || r.status));
  return (j.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim();
}
const SYSTEM = `Sen Telegram kanal uchun post yozadigan tajribali muharrirsan.
Faqat tayyor post matnini qaytar: izoh, "Mana post" kabi kirish so'zlari, sarlavha belgilari yoki qo'shtirnoqsiz.
Til: o'zbek (lotin yozuvi), agar ko'rsatmada boshqa til aytilmagan bo'lsa.
Hajm: 500 dan 1200 belgigacha. Qisqa paragraflar, birinchi qator e'tiborni tortsin.
Emoji ko'pi bilan 3 ta. Kerak bo'lsa oxirida 2-4 ta heshteg.
Faktlarni to'qima: narx, raqam, manzil, telefon, sana yoki aksiya faqat ko'rsatmada berilgan bo'lsa ishlatiladi.
Telegram oddiy matn sifatida yuboriladi, Markdown belgilarini (**, ##) ishlatma.`;
export async function writePost(ap: any) {
  const { data: last } = await db().from('telegram_posts').select('text').eq('autopost_id', ap.id).neq('status', 'canceled').order('scheduled_at', { ascending: false }).limit(8);
  const recent = (last || []).map((x, i) => `${i + 1}. ${x.text.slice(0, 280).replace(/\s+/g, ' ')}`).join('\n') || "hali yo'q";
  const user = `Kanal va yo'nalish haqida:\n${ap.brief}\n\nOxirgi postlar (mavzu va boshlanishini takrorlama):\n${recent}\n\nBugun: ${today()}. Bitta yangi post yoz.`;
  return (await claude(SYSTEM, user, ap.model)).slice(0, 4000);
}
const slotIso = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+05:00`).toISOString();
export function nextSlots(ap: any, hours: number) {
  const now = Date.now(), out: string[] = [];
  const d0 = today(), d1 = new Date(Date.parse(d0 + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10);
  for (const d of [d0, d1]) for (const t of ap.times || []) { if (!/^\d{2}:\d{2}$/.test(t)) continue; const iso = slotIso(d, t), ms = Date.parse(iso); if (ms > now && ms - now <= hours * 36e5) out.push(iso); }
  return out.sort();
}
export async function planOne(ap: any) {
  const slots = nextSlots(ap, ap.mode === 'review' ? 24 : 2);
  if (!slots.length) return false;
  const { data: have } = await db().from('telegram_posts').select('scheduled_at').eq('autopost_id', ap.id).in('scheduled_at', slots);
  const taken = new Set((have || []).map(x => new Date(x.scheduled_at).toISOString()));
  const slot = slots.find(s => !taken.has(s)); if (!slot) return false;
  const text = await writePost(ap);
  await db().from('telegram_posts').insert({ autopost_id: ap.id, bot_id: ap.bot_id, chat_id: ap.chat_id, text, scheduled_at: slot, status: ap.mode === 'review' ? 'draft' : 'scheduled' });
  return true;
}
export async function publishTg(p: any) {
  try {
    const bot = await getBot(p.bot_id); if (!bot) throw new Error('Bot topilmadi');
    await botSend(bot, p.chat_id, p.text);
    await db().from('telegram_posts').update({ status: 'published', published_at: new Date().toISOString(), error: null }).eq('id', p.id);
    return true;
  } catch (e: any) { await db().from('telegram_posts').update({ status: 'failed', error: String(e.message || e).slice(0, 300) }).eq('id', p.id); return false; }
}
export async function tickTelegram(deadline: number) {
  const { data: due } = await db().from('telegram_posts').select('*').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).limit(10);
  let pub = 0, gen = 0;
  for (const p of due || []) { if (Date.now() > deadline) break; await db().from('telegram_posts').update({ status: 'publishing' }).eq('id', p.id).eq('status', 'scheduled'); if (await publishTg(p)) pub++; }
  if (!(await secret('ANTHROPIC_API_KEY'))) return { pub, gen };
  const { data: aps } = await db().from('telegram_autopost').select('*').eq('active', true);
  for (const ap of aps || []) { if (gen >= 2 || Date.now() > deadline - 25000) break; try { if (await planOne(ap)) gen++; } catch {} }
  return { pub, gen };
}
export const fmtTimes = (t: string[]) => (t || []).join(', ');
export const parseTimes = (s: string) => Array.from(new Set(s.split(/[,\s]+/).map(x => x.trim()).filter(x => /^\d{1,2}:\d{2}$/.test(x)).map(x => x.padStart(5, '0')).filter(x => +x.slice(0, 2) < 24 && +x.slice(3) < 60))).sort();
export { TZ };
