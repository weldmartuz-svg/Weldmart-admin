import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, requireAuth, graph } from '@/lib/s';
import { runRule } from '@/lib/ig';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export default async function Ar({ params }: any) {
  await requireAuth();
  const { id } = await params;
  const { data: p } = await db().from('projects').select('id,name,ig_user_id').eq('id', id).maybeSingle();
  if (!p) notFound();
  const { data: rules } = await db().from('autoreply_rules').select('*').eq('project_id', id).order('created_at', { ascending: false });
  let media: any[] = [], merr = '';
  if (p.ig_user_id) { try { media = (await graph(`${p.ig_user_id}/media`, { fields: 'id,caption,timestamp', limit: '15' })).data || []; } catch (e: any) { merr = e.message; } }
  const path = `/p/${id}/autoreply`;
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const [mid, ...lab] = String(fd.get('post') || '').split('|');
    const kw = String(fd.get('kw') || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    const dm = String(fd.get('dm') || '').trim();
    if (mid && kw.length && dm) await db().from('autoreply_rules').insert({ project_id: id, ig_media_id: mid, post_label: lab.join('|'), keywords: kw, dm_text: dm, reply_text: String(fd.get('reply') || '').trim() || null });
    revalidatePath(path);
  }
  async function act(fd: FormData) {
    'use server'; await requireAuth();
    const rid = String(fd.get('rid')), op = String(fd.get('op'));
    const { data: r } = await db().from('autoreply_rules').select('*').eq('id', rid).eq('project_id', id).single();
    if (r) {
      if (op === 'del') await db().from('autoreply_rules').delete().eq('id', rid);
      if (op === 'toggle') await db().from('autoreply_rules').update({ active: !r.active }).eq('id', rid);
      if (op === 'check') { try { await runRule(r); } catch (e: any) { await db().from('autoreply_rules').update({ last_checked: new Date().toISOString() }).eq('id', rid); } }
    }
    revalidatePath(path);
  }
  return (<>
    <h1><Link href={`/p/${id}`}>{p.name}</Link> · Avtojavob</h1>
    <p className="m">Postga kalit so'z bilan komment yozilsa, o'sha odamga Direct'da avtomatik xabar boradi. Har 5 daqiqada tekshiriladi. Direct javob komment yozilgandan keyin 7 kun ichida mumkin.</p>
    <form action={add} className="c"><h2>Yangi qoida</h2>
      {merr && <p className="e">{merr}</p>}
      <select name="post" required style={{ width: '100%', padding: 9, marginBottom: 8 }}><option value="">Postni tanlang</option>
        {media.map(m => <option key={m.id} value={`${m.id}|${(m.caption || '').slice(0, 50)}`}>{(m.timestamp || '').slice(0, 10)} · {(m.caption || '').slice(0, 50)}</option>)}</select>
      <textarea name="kw" rows={2} placeholder="Kalit so'zlar (vergul bilan): ai, ай, a.i" required />
      <textarea name="dm" rows={3} placeholder="Direct xabar matni" required /><input name="reply" placeholder="Kommentga javob (ixtiyoriy), masalan: Direct'ga yubordik ✅" />
      <button>Qo'shish</button></form>
    {(rules || []).map(r => <div key={r.id} className="c"><b>{r.post_label || r.ig_media_id}</b> <span className="m">{r.active ? 'Ishlayapti' : 'Pauza'} · oxirgi tekshiruv: {r.last_checked ? new Date(r.last_checked).toLocaleString('uz', { timeZone: 'Asia/Tashkent' }) : '—'}</span>
      <p className="m">Kalit so'zlar: {r.keywords.join(', ')}</p><p>{r.dm_text}</p>
      <p className="m">{r.seen} ta komment ko'rildi · {r.matched} ta mos keldi · {r.sent} ta yuborildi</p>
      <form action={act}><input type="hidden" name="rid" value={r.id} />
        <button name="op" value="check" style={{ marginRight: 6 }}>Hozir tekshirish</button><button name="op" value="toggle" style={{ marginRight: 6, background: '#495057' }}>{r.active ? 'Pauza' : 'Yoqish'}</button><button name="op" value="del" style={{ background: '#c92a2a' }}>O'chirish</button></form></div>)}
  </>);
}
