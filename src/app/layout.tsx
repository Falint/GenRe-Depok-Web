import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';

const jakarta = localFont({
  src: './fonts/PlusJakartaSans.ttf',
  display: 'swap',
  variable: '--font-jakarta',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Portal Resmi Forum GenRe Kota Depok', template: '%s | GenRe Depok' },
  description: 'Ruang administrasi, komunikasi, dan sumber daya pengurus Forum GenRe Kota Depok.',
  robots: { index: false, follow: false },
  icons: { icon: '/logo-genre-depok.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className={jakarta.variable}>{children}</body>
    </html>
  );
}
