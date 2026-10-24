import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

// Figtree: friendly, rounded geometric sans for both headings and text.
const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CampusFlow',
  description: 'Book a ride between campus stops and track it live.',
};

export const viewport: Viewport = {
  themeColor: '#f5f5fa',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-dvh flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
