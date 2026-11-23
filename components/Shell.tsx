import Link from 'next/link';
import { db } from '@/lib/s';
import I from './Icon';
import Theme from './Theme';
export function Av({ name }: { name: string }) { return <span className="av" aria-hidden="true">{(name || '?').replace(/^@/, '').slice(0, 1).toUpperCase()}</span>; }
export const isIg = (p: any) => p.kind !== 'target' || !!p.ig_user_id;
export const projHome = (p: any) => (p.kind === 'target' ? `/p/${p.id}` : `/p/${p.id}/instagram`);
type Crumb = { href?: string; label: string };
async function Nav({ active }: { active: string }) {
  const [{ data: ps }, { data: bots }] = await Promise.all([db().from('projects').select('id,kind,ig_user_id'), db().from('telegram_bots').select('id')]);
  const igN = (ps || []).filter(isIg).length, adN = (ps || []).filter(p => p.kind === 'target').length, tgN = (bots || []).length;
  const cur = (k: string) => (active === k ? { 'aria-current': 'page' as const } : {});
  const item = (href: string, icon: string, label: string, k: string, n?: number) => <Link className="nl" href={href} {...cur(k)}><I n={icon} s={17} />{label}{n ? <span className="count">{n}</span> : null}</Link>;
  return <>
    {item('/', 'grid', 'Umumiy', 'home')}
    {item('/telegram', 'send', 'Telegram', 'tg', tgN)}
    {item('/instagram', 'ig', 'Instagram', 'ig', igN)}
    {item('/ads', 'chart', 'Meta Ads Manager', 'ads', adN)}
    <div className="nav-h">Tizim</div>
    {item('/settings', 'gear', 'Sozlamalar', 'set')}
  </>;
}
export default async function Shell({ active, crumbs = [], children }: { project?: any; active: string; crumbs?: Crumb[]; children: any }) {
  const nav = await Nav({ active });
  return (<div className="app">
    <aside className="side" aria-label="Asosiy menyu">
      <Link href="/" className="mark" aria-label="Weldmart Admin, bosh sahifa"><img src="/logo.png" alt="" width={32} height={32} />Weldmart</Link>
      <nav style={{ display: 'grid', gap: 'var(--space-3xs)' }}>{nav}</nav>
      <div className="who"><Av name={process.env.ADMIN_EMAIL || 'A'} /><div><span>{process.env.ADMIN_EMAIL || 'admin'}</span><small>Administrator</small></div>
        <a className="btn btn-q btn-s" href="/logout" aria-label="Chiqish"><I n="out" s={16} /></a></div>
    </aside>
    <div className="main">
      <header className="bar">
        <details className="menu"><summary className="btn btn-q icon-btn" aria-label="Menyu"><I n="menu" s={18} /></summary><nav className="menu-panel">{nav}<a className="nl" href="/logout"><I n="out" s={17} />Chiqish</a></nav></details>
        <ol className="crumbs"><li><Link href="/">Weldmart</Link></li>{crumbs.map((c, i) => <li key={i}>{c.href && i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>)}</ol>
        <Theme />
      </header>
      <main className="page">{children}</main>
    </div>
  </div>);
}
