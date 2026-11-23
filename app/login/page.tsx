import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { makeSession } from '@/lib/s';
export const metadata = { title: 'Weldmart Admin: kirish' };
export default async function Login({ searchParams }: any) {
  const sp = await searchParams;
  async function go(fd: FormData) {
    'use server';
    const okE = fd.get('e') === process.env.ADMIN_EMAIL, okP = !!process.env.ADMIN_PASSWORD && fd.get('p') === process.env.ADMIN_PASSWORD;
    if (okE && okP) { (await cookies()).set('s', makeSession(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 604800 }); redirect('/'); }
    await new Promise(r => setTimeout(r, 1500));
    redirect('/login?x=1');
  }
  return (<div className="login">
    <section className="login-l"><span className="mark" style={{ padding: 0 }}><img src="/logo.png" alt="" width={32} height={32} />Weldmart</span>
      <h1>Hamma akkauntlar bitta navbatda</h1>
      <ul><li>Bir nechta Instagram akkauntga post rejalashtirish</li><li>Kalit so'zli kommentga avtomatik Direct</li><li>Meta reklama xarajati va natijasi</li><li>Komment va Direct'lar Telegram botga</li></ul></section>
    <section className="login-r"><form action={go} className="form"><h2 style={{ fontSize: 'var(--text-2xl)' }}>Kirish</h2>
      <label className="field"><span>Login</span><input name="e" type="text" autoComplete="username" required /></label>
      <label className="field"><span>Parol</span><input name="p" type="password" autoComplete="current-password" required /></label>
      {sp?.x && <p className="note note-bad" role="alert">Login yoki parol noto'g'ri.</p>}
      <button type="submit" className="btn btn-p">Kirish</button></form></section>
  </div>);
}
