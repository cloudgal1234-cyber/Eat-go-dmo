import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui';

export const metadata: Metadata = {
  title: 'AET GO – מערכת ניהול מסעדות',
  description: 'דמו של AET GO: הזמנה מהשולחן, מטבח, מלצרים, קופה, משלוחים, מלאי ומועדון לקוחות',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ff5a1f' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
