import './globals.css';
export const metadata = { title: 'Weldmart Admin' };
export default function L({ children }: any) {
  return (<html lang="uz" suppressHydrationWarning><head>
    <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('t');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
  </head><body>{children}</body></html>);
}
