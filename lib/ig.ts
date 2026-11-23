import { db, graph, notify } from './s';
export async function publishPost(p: any) {
  const { data: pr } = await db().from('projects').select('id,name,ig_user_id,ig_username,tg_bot_token,tg_chat_id').eq('id', p.project_id).single();
  const who = pr?.ig_username ? '@' + pr.ig_username : pr?.name;
  try {
    if (!pr?.ig_user_id) throw new Error('Instagram akkaunt ulanmagan');
    const c = await graph(`${pr.ig_user_id}/media`, { image_url: p.media_url, caption: p.caption || '' }, true);
    const m = await graph(`${pr.ig_user_id}/media_publish`, { creation_id: c.id }, true);
    await db().from('ig_posts').update({ status: 'published', ig_media_id: m.id, error: null }).eq('id', p.id);
    await notify(pr, `📤 ${who}: post chiqdi\n${(p.caption || '').slice(0, 200)}`);
    return true;
  } catch (e: any) {
    const msg = String(e.message || e);
    await db().from('ig_posts').update({ status: 'failed', error: msg }).eq('id', p.id);
    await notify(pr, `⚠️ ${who}: post chiqmadi\n${msg}`);
    return false;
  }
}
const norm = (s: string) => s.toLowerCase().normalize('NFKC');
export async function runRule(r: any) {
  const { data: pr } = await db().from('projects').select('ig_user_id').eq('id', r.project_id).single();
  const cm = await graph(`${r.ig_media_id}/comments`, { fields: 'id,text,username', limit: '50' });
  let seen = 0, matched = 0, sent = 0;
  for (const c of cm.data || []) {
    const ex = await db().from('autoreply_log').select('comment_id').eq('rule_id', r.id).eq('comment_id', c.id).maybeSingle();
    if (ex.data) continue;
    seen++;
    let status = 'skipped';
    if ((r.keywords || []).some((k: string) => k && norm(c.text || '').includes(norm(k)))) {
      matched++;
      try {
        await graph(`${pr!.ig_user_id}/messages`, { recipient: JSON.stringify({ comment_id: c.id }), message: JSON.stringify({ text: r.dm_text }) }, true);
        sent++; status = 'sent';
        if (r.reply_text) await graph(`${c.id}/replies`, { message: r.reply_text }, true);
      } catch (e: any) { status = 'error: ' + String(e.message || e).slice(0, 200); }
    }
    await db().from('autoreply_log').insert({ rule_id: r.id, comment_id: c.id, status });
  }
  await db().from('autoreply_rules').update({ seen: r.seen + seen, matched: r.matched + matched, sent: r.sent + sent, last_checked: new Date().toISOString() }).eq('id', r.id);
}
