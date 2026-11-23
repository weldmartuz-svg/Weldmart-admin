import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { makeSession } from '@/lib/s';
import I from '@/components/Icon';
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
    <section className="hero"><span className="brand" style={{ padding: 0 }}><span className="logo">W</span>Weldmart Admin</span>
      <h1>Instagram, reklama va mijoz xabarlari — bitta panelda</h1>
      <ul><li><i><I n="ig" s={17} /></i>Postlarni joylash va rejalashtirish</li><li><i><I n="bolt" s={17} /></i>Kalit so'zli kommentlarga avtomatik Direct</li>
        <li><i><I n="chart" s={17} /></i>Meta reklama xarajati va natijalari</li><li><i><I n="send" s={17} /></i>Yangi komment va xabarlar Telegramga</li></ul></section>
    <section className="lf"><form action={go}><h2 style={{ margin: 0, fontSize: 26 }}>Kabinetga kirish</h2><p className="m" style={{ marginTop: -8 }}>Faqat administrator uchun</p>
      <label>Login<input name="e" type="text" autoComplete="username" required /></label>
      <label>Parol<input name="p" type="password" autoComplete="current-password" required /></label>
      {sp?.x && <div className="alert">Login yoki parol noto'g'ri</div>}<button className="btn p">Kirish</button></form></section>
  </div>);
}
