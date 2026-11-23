import './globals.css';
import Link from 'next/link';
export const metadata = { title: 'Weldmart Admin' };
export default function L({ children }: any) {
  return (<html lang="uz"><body><nav><b>Weldmart Admin</b><Link href="/">Loyihalar</Link><Link href="/settings">Sozlamalar</Link><a href="/logout">Chiqish</a></nav><main>{children}</main></body></html>);
}
