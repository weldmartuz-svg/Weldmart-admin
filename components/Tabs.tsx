import Link from 'next/link';
import { db } from '@/lib/s';
import { handle } from '@/lib/ui';
import { isIg } from './Shell';
const IG_SUB: [string, string][] = [['instagram', 'Postlar'], ['autoreply', 'Avtojavob'], ['inbox', 'Xabarlar'], ['settings', 'Sozlamalar']];
const AD_SUB: [string, string][] = [['', 'Statistika'], ['settings', 'Sozlamalar']];
export async function AcctTabs({ p, sub, kind }: { p: any; sub: string; kind: 'ig' | 'ad' }) {
  const { data } = await db().from('projects').select('id,name,kind,ig_user_id,ig_username').order('created_at');
  const { data: q } = await db().from('ig_posts').select('project_id').eq('status', 'scheduled');
  const list = (data || []).filter(x => (kind === 'ig' ? isIg(x) : x.kind === 'target'));
  const subs = kind === 'ig' ? IG_SUB : AD_SUB;
  const base = (id: string, s: string) => `/p/${id}${s ? '/' + s : ''}`;
  return <>
    <nav className="tabs-acc" aria-label={kind === 'ig' ? 'Instagram akkauntlar' : 'Reklama kabinetlari'}>
      {list.map(x => { const n = (q || []).filter(y => y.project_id === x.id).length; return <Link key={x.id} href={base(x.id, kind === 'ig' ? sub || 'instagram' : sub)} {...(x.id === p.id ? { 'aria-current': 'page' as const } : {})}>{kind === 'ig' ? handle(x) : x.name}{kind === 'ig' && n > 0 && <span className="count">{n}</span>}</Link>; })}
      <Link className="add" href={kind === 'ig' ? '/accounts' : '/ads?new=1'}>+ {kind === 'ig' ? 'Akkaunt' : 'Kabinet'}</Link>
    </nav>
    <nav className="seg" aria-label="Bo'lim">{subs.map(([s, l]) => <Link key={s} href={base(p.id, s)} {...(s === sub ? { 'aria-current': 'true' as const } : {})}>{l}</Link>)}</nav>
  </>;
}
export async function BotTabs({ bot, tab }: { bot?: any; tab: string }) {
  const { data } = await db().from('telegram_bots').select('id,name,username').order('created_at');
  return <nav className="tabs-acc" aria-label="Telegram botlar">
    {(data || []).map(b => <Link key={b.id} href={`/telegram/${b.id}${tab && tab !== 'stat' ? '?t=' + tab : ''}`} {...(bot?.id === b.id ? { 'aria-current': 'page' as const } : {})}>{b.username ? '@' + b.username : b.name}</Link>)}
    <Link className="add" href="/telegram/new" {...(!bot ? { 'aria-current': 'page' as const } : {})}>+ Bot</Link>
  </nav>;
}
