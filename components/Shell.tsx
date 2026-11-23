import Link from 'next/link';
import { db } from '@/lib/s';
import { avatarColor } from '@/lib/ui';
import I from './Icon';
import ThemeBtn from './ThemeBtn';
export function Av({ name, size = 28 }: { name: string; size?: number }) {
  return <span className="av" style={{ background: avatarColor(name), width: size, height: size, fontSize: size > 24 ? 13 : 11 }}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
}
export const kindLabel = (k?: string) => (k === 'target' ? 'Target' : 'Kontent');
export const projHome = (p: any) => (p.kind === 'target' ? `/p/${p.id}` : `/p/${p.id}/instagram`);
type Crumb = { href?: string; label: string };
export default async function Shell({ project, active, crumbs = [], children }: { project?: any; active: string; crumbs?: Crumb[]; children: any }) {
  const { data } = await db().from('projects').select('id,name,kind').order('created_at');
  const list = data || [];
  const nv = (href: string, icon: string, label: string, key: string) => <Link href={href} className={'nv' + (active === key ? ' on' : '')}><I n={icon} />{label}</Link>;
  const plink = (x: any) => <Link key={x.id} href={projHome(x)} className="nv"><Av name={x.name} size={22} />{x.name}</Link>;
  const targets = list.filter(x => x.kind === 'target'), content = list.filter(x => x.kind !== 'target');
  return (<div className="app">
    <aside className="sb">
      <Link href="/" className="brand"><span className="logo">W</span>Weldmart</Link>
      {project && <details className="sw"><summary><Av name={project.name} /><span><b>{project.name}{project.ig_username ? ` · ${project.ig_username}` : ''}</b><small>{kindLabel(project.kind)}</small></span><I n="chev" s={16} /></summary>
        <div className="swl">{list.map(x => <Link key={x.id} href={projHome(x)}><Av name={x.name} size={22} /><span style={{ flex: 1 }}>{x.name}</span><small>{kindLabel(x.kind)}</small></Link>)}</div></details>}
      {nv('/', 'grid', 'Umumiy', 'home')}
      {project ? <>
        <div className="sec">{project.kind === 'target' ? 'Reklama' : 'Kontent'}</div>
        {project.kind === 'target' && nv(`/p/${project.id}`, 'chart', 'Umumiy stat', 'stat')}
        {nv(`/p/${project.id}/instagram`, 'ig', 'Instagram', 'ig')}
        {nv(`/p/${project.id}/autoreply`, 'bolt', 'Avtojavob', 'ar')}
        {nv(`/p/${project.id}/inbox`, 'inbox', 'Xabarlar', 'inbox')}
        <div className="sec">Loyiha</div>
        {nv(`/p/${project.id}/settings`, 'gear', 'Sozlamalar', 'pset')}
        {nv('/', 'back', 'Admin panel', '-')}
      </> : <>
        <div className="sec">Target loyihalar</div>
        {targets.length ? targets.map(plink) : <p className="sbm">Hali yo'q</p>}
        <div className="sec">Kontent loyihalar</div>
        {content.length ? content.map(plink) : <p className="sbm">Hali yo'q</p>}
        <div className="sec">Tizim</div>
        {nv('/settings', 'gear', 'Sozlamalar', 'set')}
      </>}
      <div className="me"><span className="av" style={{ background: '#3d4f4b', width: 32, height: 32 }}>{(process.env.ADMIN_EMAIL || 'A').slice(0, 1).toUpperCase()}</span>
        <span><b>{process.env.ADMIN_EMAIL || 'admin'}</b><small>Administrator</small></span>
        <Link href="/settings" title="Sozlamalar"><I n="gear" s={17} /></Link><a href="/logout" title="Chiqish"><I n="out" s={17} /></a></div>
    </aside>
    <div style={{ minWidth: 0 }}>
      <header className="top"><nav className="bc"><Link href="/">Weldmart</Link>{crumbs.map((c, i) => <span key={i}>{'  /  '}{c.href ? <Link href={c.href}>{c.label}</Link> : <b>{c.label}</b>}</span>)}</nav><ThemeBtn /></header>
      <main className="ct">{children}</main>
    </div>
  </div>);
}
