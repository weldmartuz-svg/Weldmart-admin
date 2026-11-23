import { redirect } from 'next/navigation';
import { db, requireAuth } from '@/lib/s';
import { q } from '@/lib/ui';
import Shell from '@/components/Shell';
import { Flash } from '@/components/Bits';
export const dynamic = 'force-dynamic';
export default async function Ads({ searchParams }: any) {
  await requireAuth();
  const sp = await searchParams;
  const { data } = await db().from('projects').select('id').eq('kind', 'target').order('created_at');
  if (data?.length && !sp?.new) redirect(`/p/${data[0].id}`);
  async function add(fd: FormData) {
    'use server'; await requireAuth();
    const name = String(fd.get('name') || '').trim();
    if (!name) redirect('/ads?new=1&err=' + q('Loyiha nomini kiriting.'));
    const { data: r, error } = await db().from('projects').insert({ name, kind: 'target' }).select('id').single();
    if (error) redirect('/ads?new=1&err=' + q(error.message));
    redirect(`/p/${r!.id}/settings?ok=` + q('Loyiha yaratildi. Endi reklama kabinetini tanlang.'));
  }
  return <Shell active="ads" crumbs={[{ label: 'Meta Ads Manager' }]}><Flash sp={sp} />
    <div className="head"><div><h1>Meta Ads Manager</h1><p>Har bir reklama kabineti alohida tabda: sarf, natijalar va kampaniyalar.</p></div></div>
    <form action={add} className="panel form" style={{ maxWidth: '34rem' }}><h2>Reklama kabinetini qo'shish</h2>
      <label className="field"><span>Nomi</span><input name="name" required autoComplete="off" placeholder="Weldmart reklama" /><span className="help">Keyingi qadamda reklama kabinetini ro'yxatdan tanlaysiz.</span></label>
      <div><button type="submit" className="btn btn-p">Yaratish</button></div></form></Shell>;
}
