import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, requireAuth } from '@/lib/s';
export const dynamic = 'force-dynamic';
export default async function Home({ searchParams }: any) {
  const sp = await searchParams;
  await requireAuth();
  const { data: ps, error: le } = await db().from('projects').select('id,name,ig_user_id,ad_account_id').order('created_at', { ascending: false });
  async function add(fd: FormData) { 'use server'; await requireAuth(); const name = String(fd.get('name') || '').trim(); if (name) { const { error } = await db().from('projects').insert({ name }); if (error) redirect('/?err=' + encodeURIComponent(error.message)); } revalidatePath('/'); redirect('/'); }
  return (<>
    {(sp?.err || le) && <p className="c e">Xato: {sp?.err || le?.message}</p>}
    <form action={add} className="c"><h2>Yangi loyiha</h2><input name="name" placeholder="Loyiha nomi" required /><button>Qo'shish</button></form>
    <div className="c"><h2>Loyihalar</h2>{ps?.length ? ps.map(p => <Link key={p.id} href={`/p/${p.id}`} className="l"><b>{p.name}</b> <span className="m">IG: {p.ig_user_id || '—'} · Reklama: {p.ad_account_id || '—'}</span></Link>) : <p className="m">Hozircha loyiha yo'q</p>}</div>
  </>);
}
