import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { makeSession } from '@/lib/s';
export default async function Login({ searchParams }: any) {
  const sp = await searchParams;
  async function go(fd: FormData) {
    'use server';
    const okE = fd.get('e') === process.env.ADMIN_EMAIL, okP = !!process.env.ADMIN_PASSWORD && fd.get('p') === process.env.ADMIN_PASSWORD;
    if (okE && okP) { (await cookies()).set('s', makeSession(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 604800 }); redirect('/'); }
    await new Promise(r => setTimeout(r, 1500));
    redirect("/login?x=1");
  }
  return (<form action={go} className="c" style={{ maxWidth: 380, margin: '60px auto' }}><h1>Kirish</h1>
    <input name="e" type="text" placeholder="Login" autoComplete="username" required /><input name="p" type="password" placeholder="Parol" required />
    {sp?.x && <p className="e">Login yoki parol noto'g'ri</p>}<button>Kirish</button></form>);
}
