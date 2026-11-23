import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/s';
import { listBots } from '@/lib/tg';
export const dynamic = 'force-dynamic';
export default async function T() { await requireAuth(); const b = await listBots(); redirect(b.length ? `/telegram/${b[0].id}` : '/telegram/new'); }
