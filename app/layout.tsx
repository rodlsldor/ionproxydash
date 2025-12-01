import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { SWRConfig } from 'swr';
// import { getUser, getTeamForUser } from '@/lib/db/queries';

export const metadata: Metadata = {
  title: 'Home - Ion Proxy DEV',
  description: 'Get started quickly on proxies with Ion Proxy.',
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.className}>
      <body className="min-h-[100dvh]">
        <SWRConfig
          value={{
            fallback: {
              // On ne await pas ici :
              // seuls les composants qui lisent ces clés vont suspendre
              // '/api/user': getUser(),
              // '/api/team': getTeamForUser(),
            },
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
