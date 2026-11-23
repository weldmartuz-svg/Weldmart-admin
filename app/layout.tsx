import '@fontsource/host-grotesk/400.css';
import '@fontsource/host-grotesk/500.css';
import '@fontsource/atkinson-hyperlegible-mono/400.css';
import '@fontsource/atkinson-hyperlegible-mono/500.css';
import './globals.css';
export const metadata = { title: 'Weldmart Admin', description: "Instagram akkauntlar, Meta reklama va Telegram xabarlarini bitta joydan boshqarish paneli." };
export default function L({ children }: any) {
  return (<html lang="uz" suppressHydrationWarning><head>
    <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('t');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
  </head><body>{children}</body></html>);
}
