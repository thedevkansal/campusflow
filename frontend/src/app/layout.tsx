import type { Metadata, Viewport } from 'next';
import { Overpass, Atkinson_Hyperlegible_Next } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

// Display: Overpass, a libre take on Highway Gothic (road-sign lettering).
const overpass = Overpass({
  subsets: ['latin'],
  variable: '--font-overpass',
  display: 'swap',
});

// Text: Atkinson Hyperlegible Next, built for glanceable legibility.
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ['latin'],
  variable: '--font-atkinson',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CampusFlow',
  description: 'Book a ride between campus stops and track it live.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f4f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0e141b' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${overpass.variable} ${atkinson.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
