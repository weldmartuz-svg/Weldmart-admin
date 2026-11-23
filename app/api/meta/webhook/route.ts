import crypto from 'crypto';
import { db, secret, dec, tg } from '@/lib/s';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams, v = await secret('META_VERIFY_TOKEN');
  return q.get('hub.mode') === 'subscribe' && v && q.get('hub.verify_token') === v ? new Response(q.get('hub.challenge')) : new Response('forbidden', { status: 403 });
}
export async function POST(req: Request) {
  const raw = await req.text(), app = await secret('META_APP_SECRET');
  const want = 'sha256=' + crypto.createHmac('sha256', app).update(raw).digest('hex'), got = req.headers.get('x-hub-signature-256') || '';
  if (!app || got.length !== want.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) return new Response('bad signature', { status: 401 });
  const body = JSON.parse(raw);
  for (const en of body.entry || []) {
    const { data: p } = await db().from('projects').select('*').or(`ig_user_id.eq.${en.id},fb_page_id.eq.${en.id}`).limit(1).maybeSingle();
    const items: any[] = [];
    for (const c of en.changes || []) if (c.field === 'comments') items.push({ kind: 'comment', from: c.value?.from?.username, text: c.value?.text });
    for (const m of en.messaging || []) if (m.message && !m.message.is_echo) items.push({ kind: 'message', from: m.sender?.id, text: m.message.text });
    for (const i of items) {
      await db().from('ig_events').insert({ project_id: p?.id || null, kind: i.kind, from_name: i.from, body: i.text, raw: en });
      if (p?.tg_bot_token && p.tg_chat_id) { try { await tg(dec(p.tg_bot_token), p.tg_chat_id, `📩 ${p.name} · ${i.kind}\n${i.from || ''}: ${i.text || ''}`); } catch {} }
    }
  }
  return new Response('ok');
}
