import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, requireAuth } from '@/lib/s';
import Shell, { isIg } from '@/components/Shell';
export const dynamic = 'force-dynamic';
export default async function IgHome() {
  await requireAuth();
  const { data } = await db().from('projects').select('id,kind,ig_user_id').order('created_at');
  const first = (data || []).find(isIg);
  if (first) redirect(`/p/${first.id}/instagram`);
  return <Shell active="ig" crumbs={[{ label: 'Instagram' }]}><div className="head"><div><h1>Instagram</h1><p>Har bir akkaunt shu yerda alohida tabda turadi: postlar, avtojavob, xabarlar.</p></div></div>
    <div className="empty"><b>Hali akkaunt ulanmagan</b><p>Meta tokendagi akkauntlar ro'yxatidan kerakligini bir bosishda ulang.</p><Link className="btn btn-p" href="/accounts">Akkaunt ulash</Link></div></Shell>;
}
