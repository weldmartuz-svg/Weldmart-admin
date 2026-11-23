import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { db, requireAuth, graph, tg, enc, dec } from '@/lib/s';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const num = (v: any) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
export default async function P({ params }: any) {
  await requireAuth();
  const { id } = await params;
  const { data: p } = await db().from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const path = `/p/${id}`;
  async function save(fd: FormData) {
    'use server'; await requireAuth();
    const f = (k: string) => String(fd.get(k) || '').trim() || null;
    const u: any = { name: f('name') || p.name, ig_user_id: f('ig_user_id'), fb_page_id: f('fb_page_id'), tg_chat_id: f('tg_chat_id') };
    const ad = f('ad_account_id'); u.ad_account_id = ad ? (ad.startsWith('act_') ? ad : 'act_' + ad) : null;
    const t = f('tg_bot_token'); if (t) u.tg_bot_token = enc(t);
    await db().from('projects').update(u).eq('id', id); revalidatePath(path);
  }
  async function post(fd: FormData) {
    'use server'; await requireAuth();
    const file = fd.get('file') as File, caption = String(fd.get('caption') || '');
    const { data: row } = await db().from('ig_posts').insert({ project_id: id, caption, status: 'pending' }).select('id').single();
    try {
      if (!p.ig_user_id) throw new Error('Avval Instagram User ID kiriting');
      if (!file?.size) throw new Error('Rasm tanlang (JPEG)');
      const name = `${id}/${Date.now()}.jpg`;
      const up = await db().storage.from('posts').upload(name, Buffer.from(await file.arrayBuffer()), { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      const url = db().storage.from('posts').getPublicUrl(name).data.publicUrl;
      const c = await graph(`${p.ig_user_id}/media`, { image_url: url, caption }, true);
      const m = await graph(`${p.ig_user_id}/media_publish`, { creation_id: c.id }, true);
      await db().from('ig_posts').update({ status: 'published', media_url: url, ig_media_id: m.id }).eq('id', row!.id);
    } catch (e: any) { await db().from('ig_posts').update({ status: 'failed', error: String(e.message || e) }).eq('id', row!.id); }
    revalidatePath(path);
  }
  async function send(fd: FormData) {
    'use server'; await requireAuth();
    try { await tg(dec(p.tg_bot_token), p.tg_chat_id, String(fd.get('text'))); } catch (e: any) { await db().from('ig_events').insert({ project_id: id, kind: 'error', body: String(e.message) }); }
    revalidatePath(path);
  }
  let ads: any[] = [], adsErr = '';
  if (p.ad_account_id) { try { ads = (await graph(`${p.ad_account_id}/insights`, { level: 'campaign', date_preset: 'last_30d', fields: 'campaign_name,spend,impressions,reach,clicks,ctr,cpc', limit: '50' })).data || []; } catch (e: any) { adsErr = e.message; } }
  const { data: posts } = await db().from('ig_posts').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(10);
  const { data: evs } = await db().from('ig_events').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(20);
  const sum = (k: string) => ads.reduce((a, r) => a + Number(r[k] || 0), 0);
  return (<>
    <h1>{p.name}</h1>
    <p><a href={`/p/${id}/instagram`}>📅 Instagram postlar</a> · <a href={`/p/${id}/autoreply`}>⚡ Avtojavob</a></p>
    <form action={save} className="c"><h2>Ulanishlar</h2><div className="g">
      <input name="name" defaultValue={p.name} placeholder="Nomi" /><input name="ig_user_id" defaultValue={p.ig_user_id || ''} placeholder="Instagram User ID" />
      <input name="fb_page_id" defaultValue={p.fb_page_id || ''} placeholder="Facebook Page ID" /><input name="ad_account_id" defaultValue={p.ad_account_id || ''} placeholder="Reklama kabineti ID (act_...)" />
      <input name="tg_chat_id" defaultValue={p.tg_chat_id || ''} placeholder="Telegram chat ID" /><input name="tg_bot_token" type="password" placeholder={p.tg_bot_token ? 'Bot token ✅ (almashtirish uchun kiriting)' : 'Telegram bot token'} autoComplete="off" />
    </div><button>Saqlash</button></form>
    <form action={post} className="c"><h2>Instagramga post</h2><input type="file" name="file" accept="image/jpeg" /><textarea name="caption" rows={3} placeholder="Caption" /><button>Joylash</button>
      {posts?.map(x => <p key={x.id} className="m">{new Date(x.created_at).toLocaleString('uz')} — {x.status}{x.error && <span className="e"> · {x.error}</span>}</p>)}</form>
    <div className="c"><h2>Reklama statistikasi (oxirgi 30 kun)</h2>
      {!p.ad_account_id ? <p className="m">Reklama kabineti ID kiriting</p> : adsErr ? <p className="e">{adsErr}</p> : <>
        <p><b>Sarf:</b> {num(sum('spend'))} · <b>Ko'rsatuv:</b> {num(sum('impressions'))} · <b>Klik:</b> {num(sum('clicks'))}</p>
        <table><thead><tr><th>Kampaniya</th><th>Sarf</th><th>Ko'rsatuv</th><th>Qamrov</th><th>Klik</th><th>CTR %</th><th>CPC</th></tr></thead><tbody>
          {ads.map((r, i) => <tr key={i}><td>{r.campaign_name}</td><td>{num(r.spend)}</td><td>{num(r.impressions)}</td><td>{num(r.reach)}</td><td>{num(r.clicks)}</td><td>{num(r.ctr)}</td><td>{num(r.cpc)}</td></tr>)}</tbody></table></>}</div>
    <form action={send} className="c"><h2>Telegram xabar</h2><textarea name="text" rows={2} required /><button>Yuborish</button></form>
    <div className="c"><h2>Komment va direct</h2>{evs?.length ? evs.map(e => <p key={e.id} className="l"><b>{e.kind}</b> {e.from_name} <span className="m">{new Date(e.created_at).toLocaleString('uz')}</span><br />{e.body}</p>) : <p className="m">Hozircha yo'q. Meta webhook ulangach bu yerda ko'rinadi.</p>}</div>
  </>);
}
