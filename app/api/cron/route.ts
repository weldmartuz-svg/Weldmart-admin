import { db } from '@/lib/s';
import { publishPost, runRule } from '@/lib/ig';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
async function run(req: Request) {
  const s = process.env.CRON_SECRET;
  if (!s || req.headers.get('authorization') !== `Bearer ${s}`) return new Response('unauthorized', { status: 401 });
  const { data: due } = await db().from('ig_posts').select('*').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).limit(5);
  for (const p of due || []) { await db().from('ig_posts').update({ status: 'publishing' }).eq('id', p.id); await publishPost(p); }
  const { data: rules } = await db().from('autoreply_rules').select('*').eq('active', true);
  for (const r of rules || []) { try { await runRule(r); } catch {} }
  return Response.json({ ok: true, published: due?.length || 0, rules: rules?.length || 0 });
}
export const POST = run, GET = run;
