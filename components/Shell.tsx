import Link from 'next/link';
import { db } from '@/lib/s';
import I from './Icon';
import Theme from './Theme';
export function Av({ name }: { name: string }) { return <span className="av" aria-hidden="true">{(name || '?').replace(/^@/, '').slice(0, 1).toUpperCase()}</span>; }
export const projHome = (p: any) => (p.kind === 'target' ? `/p/${p.id}` : `/p/${p.id}/instagram`);
type Crumb = { href?: string; label: string };
async function Nav({ project, active }: { project?: any; active: string }) {
  const { data } = await db().from('projects').select('id,name,kind,ig_username').order('created_at');
  const { data: q } = await db().from('ig_posts').select('project_id').eq('status', 'scheduled');
  const list = data || [], cnt = (id: string) => (q || []).filter(x => x.project_id === id).length;
  const cur = (k: string) => (active === k ? { 'aria-current': 'page' as const } : {});
  const sub = (href: string, label: string, k: string) => <Link className="nl sub" href={href} {...cur(k)}>{label}</Link>;
  return <>
    <Link className="nl" href="/" {...cur('home')}><I n="grid" s={17} />Umumiy</Link>
    <Link className="nl" href="/accounts" {...cur('acc')}><I n="users" s={17} />Akkauntlar</Link>
    <Link className="nl" href="/settings" {...cur('set')}><I n="gear" s={17} />Sozlamalar</Link>
    <div className="nav-h">Loyihalar</div>
    {list.length ? list.map(x => <div key={x.id}>
      <Link className="nl" href={projHome(x)} {...(project?.id === x.id && !['ig', 'ar', 'inbox', 'pset', 'stat'].includes(active) ? { 'aria-current': 'page' as const } : {})}>
        <Av name={x.ig_username || x.name} /><span className="name">{x.ig_username ? '@' + x.ig_username : x.name}</span>{cnt(x.id) > 0 && <span className="count" title="Navbatdagi postlar">{cnt(x.id)}</span>}</Link>
      {project?.id === x.id && <>
        {x.kind === 'target' && sub(`/p/${x.id}`, 'Reklama', 'stat')}
        {sub(`/p/${x.id}/instagram`, 'Postlar', 'ig')}
        {sub(`/p/${x.id}/autoreply`, 'Avtojavob', 'ar')}
        {sub(`/p/${x.id}/inbox`, 'Xabarlar', 'inbox')}
        {sub(`/p/${x.id}/settings`, 'Sozlamalar', 'pset')}
      </>}
    </div>) : <Link className="nl" href="/accounts"><I n="plus" s={17} />Akkaunt ulash</Link>}
  </>;
}
export default async function Shell({ project, active, crumbs = [], children }: { project?: any; active: string; crumbs?: Crumb[]; children: any }) {
  const nav = await Nav({ project, active });
  return (<div className="app">
    <aside className="side" aria-label="Asosiy menyu">
      <Link href="/" className="mark" aria-label="Weldmart Admin, bosh sahifa"><span>W</span>Weldmart</Link>
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
