import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, requireAuth, secret, graph } from '@/lib/s';
import { num, q } from '@/lib/ui';
import Shell, { Av } from '@/components/Shell';
import { Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
async function load() {
  const r = await graph('me/accounts', { fields: 'id,name,instagram_business_account{id,username,followers_count,media_count}', limit: '100' });
  return (r.data || []).filter((x: any) => x.instagram_business_account).map((x: any) => ({ page: x.id, pageName: x.name, ...x.instagram_business_account }));
}
export default async function Accounts({ searchParams }: any) {
  await requireAuth();
  const sp = await searchParams;
  const token = !!(await secret('META_TOKEN'));
  let accs: any[] = [], err = '';
  if (token) { try { accs = await load(); } catch (e: any) { err = String(e.message); } }
  const { data: ps } = await db().from('projects').select('id,name,ig_user_id');
  const linked = new Map((ps || []).filter(p => p.ig_user_id).map(p => [p.ig_user_id, p]));
  async function connect(fd: FormData) {
    'use server'; await requireAuth();
    const ids = fd.getAll('ig').map(String);
    const all = await load(); const { data: ex } = await db().from('projects').select('ig_user_id');
    const have = new Set((ex || []).map(x => x.ig_user_id));
    const add = all.filter((a: any) => ids.includes(a.id) && !have.has(a.id)).map((a: any) => ({ name: a.username, kind: 'kontent', ig_user_id: a.id, ig_username: a.username, fb_page_id: a.page }));
    if (add.length) { const { error } = await db().from('projects').insert(add); if (error) redirect('/accounts?err=' + q(error.message)); }
    revalidatePath('/', 'layout'); redirect('/accounts?ok=' + q(`${add.length} ta akkaunt ulandi.`));
  }
  const free = accs.filter(a => !linked.has(a.id));
  return (<Shell active="acc" crumbs={[{ label: 'Akkauntlar' }]}>
    <Flash sp={sp} />
    <div className="head"><div><h1>Instagram akkauntlar</h1><p>Meta system user tokeniga biriktirilgan barcha Business va Creator akkauntlar. Ulangan har bir akkaunt panelda alohida loyiha bo'ladi.</p></div>
      {free.length > 1 && <form action={connect}>{free.map(a => <input key={a.id} type="hidden" name="ig" value={a.id} />)}<button type="submit" className="btn btn-p">Hammasini ulash ({free.length})</button></form>}</div>
    {!token ? <div className="empty"><b>Meta token kiritilmagan</b><p>Business Manager'da system user yarating, unga Instagram akkauntlar bog'langan Facebook sahifalarni biriktiring va token oling. Tokenni Sozlamalar sahifasiga kiriting.</p><Link className="btn btn-p" href="/settings">Sozlamalarga o'tish</Link></div>
      : err ? <div className="empty"><b>Meta akkauntlar ro'yxatini bermadi</b><p className="bad">{err}</p><p>Token muddati o'tgan bo'lishi yoki ruxsatlar yetishmasligi mumkin: pages_show_list, instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_messages.</p><Link className="btn" href="/settings">Tokenni tekshirish</Link></div>
      : !accs.length ? <div className="empty"><b>Akkaunt topilmadi</b><p>System userga hech qaysi Facebook sahifa biriktirilmagan yoki sahifalarga Instagram akkaunt bog'lanmagan. Business Manager'da system user → Assets → Pages bo'limini tekshiring.</p></div>
      : <div className="scroll"><table className="tbl stack"><thead><tr><th>Akkaunt</th><th>Facebook sahifa</th><th className="r">Obunachilar</th><th className="r">Postlar</th><th>Holat</th><th><span className="visually-hidden">Amal</span></th></tr></thead>
        <tbody>{accs.map(a => { const p = linked.get(a.id); return <tr key={a.id}>
          <td><div className="who-cell"><Av name={a.username} /><span><b>@{a.username}</b><small className="m">{a.id}</small></span></div></td>
          <td data-label="Sahifa">{a.pageName}</td><td className="r m" data-label="Obunachilar">{num(a.followers_count)}</td><td className="r m" data-label="Postlar">{num(a.media_count)}</td>
          <td>{p ? <span className="chip chip-ok">ulangan</span> : <span className="chip">ulanmagan</span>}</td>
          <td className="r">{p ? <Link className="btn btn-s" href={`/p/${p.id}/instagram`}>Ochish</Link> : <form action={connect}><input type="hidden" name="ig" value={a.id} /><button type="submit" className="btn btn-s">Ulash</button></form>}</td></tr>; })}</tbody></table></div>}
  </Shell>);
}
