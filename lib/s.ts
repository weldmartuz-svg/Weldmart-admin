import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const key = () => crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || '').digest();
export const enc = (t: string) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key(), iv); const e = Buffer.concat([c.update(t, 'utf8'), c.final()]); return [iv, c.getAuthTag(), e].map(b => b.toString('base64')).join('.'); };
export const dec = (s?: string | null) => { if (!s) return ''; try { const [iv, tag, e] = s.split('.').map(x => Buffer.from(x, 'base64')); const d = crypto.createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag); return Buffer.concat([d.update(e), d.final()]).toString('utf8'); } catch { return ''; } };
const sign = (v: string) => crypto.createHmac('sha256', process.env.SESSION_SECRET || 'x').update(v).digest('hex');
export const makeSession = () => { const exp = String(Date.now() + 7 * 864e5); return exp + '.' + sign(exp); };
export async function requireAuth() {
  const [exp, sig] = ((await cookies()).get('s')?.value || '').split('.');
  const ok = exp && sig && sig.length === 64 && Number(exp) > Date.now() && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp)));
  if (!ok) redirect('/login');
}
export async function secret(k: string) {
  const { data } = await db().from('app_settings').select('value').eq('key', k).maybeSingle();
  return dec(data?.value) || process.env[k] || '';
}
export async function setSecret(k: string, v: string) { if (v) await db().from('app_settings').upsert({ key: k, value: enc(v), updated_at: new Date().toISOString() }); }
export async function graph(path: string, p: Record<string, string> = {}, post = false) {
  const body = new URLSearchParams({ ...p, access_token: await secret('META_TOKEN') });
  const url = `https://graph.facebook.com/v21.0/${path}`;
  const r = await fetch(post ? url : url + '?' + body, post ? { method: 'POST', body } : {});
  const j = await r.json(); if (j.error) throw new Error(j.error.message); return j;
}
export async function tgToken(p?: any) { return dec(p?.tg_bot_token) || (await secret('TELEGRAM_BOT_TOKEN')); }
export async function notify(p: any, text: string) {
  if (!p?.tg_chat_id) return;
  const t = await tgToken(p); if (!t) return;
  try { await tg(t, p.tg_chat_id, text); } catch {}
}
export async function tgApi(token: string, method: string, body: any = {}) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json(); if (!j.ok) throw new Error('Telegram: ' + (j.description || r.status)); return j.result;
}
export async function tg(token: string, chat: string, text: string) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }) });
  if (!r.ok) throw new Error('Telegram: ' + (await r.text()));
}
