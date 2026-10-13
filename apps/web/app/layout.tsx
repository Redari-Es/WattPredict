import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '瓦特预言 WattPredict',
  description: '现代化电费推演平台',
};

/** 首屏前应用已保存的主题，避免日夜模式闪烁（FOUC） */
const themeInitScript = `
try {
  var t = localStorage.getItem('watt-theme');
  if (t === 'light') document.documentElement.classList.remove('dark');
  else document.documentElement.classList.add('dark');
} catch (e) { document.documentElement.classList.add('dark'); }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
