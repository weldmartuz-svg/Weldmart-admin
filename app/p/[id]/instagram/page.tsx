import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, requireAuth } from '@/lib/s';
import { publishPost } from '@/lib/ig';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const T: any = { scheduled: 'Navbatda', published: 'Chiqqan', draft: 'Qoralama', failed: 'Xato / bekor' };
const fmt = (d?: string) => d ? new Date(d).toLocaleString('uz', { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' }) : '';
export default async function Ig({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params, sp = await searchParams, tab = sp?.s || 'scheduled';
  const { data: p } = await db().from('projects').select('id,name,ig_user_id').eq('id', id).maybeSingle();
  if (!p) notFound();
  const { data: all } = await db().from('ig_posts').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(100);
  const cnt = (s: string) => (all || []).filter(x => x.status === s || (s === 'scheduled' && x.status === 'publishing')).length;
  const list = (all || []).filter(x => x.status === tab || (tab === 'scheduled' && x.status === 'publishing'));
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const file = fd.get('file') as File, caption = String(fd.get('caption') || ''), at = String(fd.get('at') || ''), mode = String(fd.get('mode'));
    let url: string | null = null, err: string | null = null;
    if (!file?.size) err = 'Rasm tanlanmadi (JPEG)';
    else {
      const name = `${id}/${Date.now()}.jpg`;
      const up = await db().storage.from('posts').upload(name, Buffer.from(await file.arrayBuffer()), { contentType: 'image/jpeg' });
      if (up.error) err = up.error.message; else url = db().storage.from('posts').getPublicUrl(name).data.publicUrl;
    }
    const when = mode === 'schedule' && at ? new Date(at + '+05:00').toISOString() : new Date().toISOString();
    const { data: r } = await db().from('ig_posts').insert({ project_id: id, caption, media_url: url, scheduled_at: when, status: err ? 'failed' : mode === 'draft' ? 'draft' : 'scheduled', error: err }).select('*').single();
    if (r && !err && mode === 'now') await publishPost(r);
    revalidatePath(`/p/${id}/instagram`);
  }
  async function act(fd: FormData) {
    'use server'; await requireAuth();
    const pid = String(fd.get('pid')), op = String(fd.get('op'));
    if (op === 'del') await db().from('ig_posts').delete().eq('id', pid).eq('project_id', id);
    if (op === 'now') { const { data: r } = await db().from('ig_posts').select('*').eq('id', pid).eq('project_id', id).single(); if (r && r.media_url) await publishPost(r); }
    revalidatePath(`/p/${id}/instagram`);
  }
  return (<>
    <h1><Link href={`/p/${id}`}>{p.name}</Link> · Instagram</h1>
    <p className="m">Postlarni joylash va rejalashtirish · Toshkent vaqti · navbatdagilar har 5 daqiqada tekshiriladi</p>
    <form action={add} className="c"><h2>Yangi post</h2>
      <input type="file" name="file" accept="image/jpeg" /><textarea name="caption" rows={3} placeholder="Caption" />
      <div className="g"><label><input type="radio" name="mode" value="now" defaultChecked style={{ width: 'auto' }} /> Hozir joylash</label>
        <label><input type="radio" name="mode" value="schedule" style={{ width: 'auto' }} /> Rejalashtirish</label>
        <label><input type="radio" name="mode" value="draft" style={{ width: 'auto' }} /> Qoralama</label></div>
      <input type="datetime-local" name="at" /><button>Saqlash</button></form>
    <div className="c"><div className="g">{Object.keys(T).map(k => <Link key={k} href={`?s=${k}`} className="l" style={{ fontWeight: tab === k ? 700 : 400 }}>{T[k]} ({cnt(k)})</Link>)}</div>
      {list.length ? list.map(x => <div key={x.id} className="l" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {x.media_url && <img src={x.media_url} alt="" width={56} height={56} style={{ objectFit: 'cover', borderRadius: 8 }} />}
        <div style={{ flex: 1 }}>{(x.caption || '').slice(0, 120)}<br /><span className="m">{fmt(x.scheduled_at || x.created_at)}</span>{x.error && <span className="e"> · {x.error}</span>}</div>
        <form action={act}><input type="hidden" name="pid" value={x.id} />
          {x.status !== 'published' && <button name="op" value="now" style={{ marginRight: 6 }}>Hozir</button>}<button name="op" value="del" style={{ background: '#c92a2a' }}>O'chirish</button></form></div>) : <p className="m">Bo'sh</p>}</div>
  </>);
}
