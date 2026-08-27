import type { Metadata } from 'next';
import { Space_Grotesk, Inter, Geist_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import Header from '@/components/Header';
import AuthHydrator from '@/components/AuthHydrator';
import ConfirmProvider from '@/components/ConfirmProvider';
import GlobalAlert from '@/components/GlobalAlert';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-display-src',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const inter = Inter({
  variable: '--font-body-src',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono-src',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ShopFlow — Modern E-Commerce',
  description: 'A production-ready e-commerce demo built with Next.js and NestJS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <style>{`
          :root {
            --font-display: var(--font-display-src), "Space Grotesk", sans-serif;
            --font-body: var(--font-body-src), "Inter", sans-serif;
            --font-mono: var(--font-mono-src), monospace;
          }
          body { font-family: var(--font-body-src), "Inter", sans-serif; }
        `}</style>
        <AuthHydrator />
        <GlobalAlert />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '0.85rem',
              fontSize: '0.85rem',
            },
          }}
        />
        <ConfirmProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        </ConfirmProvider>
      </body>
    </html>
  );
}
