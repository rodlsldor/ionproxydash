import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Lexend_Deca } from 'next/font/google';
import { AuthSessionProvider } from '@/components/auth/session-provider';
// import { getUser, getTeamForUser } from '@/lib/db/queries';

export const metadata: Metadata = {
  title: 'Home - Ion Proxy DEV',
  description: 'Get started quickly on proxies with Ion Proxy.',
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const lexend = Lexend_Deca({
  subsets: ['latin'],
  weight: ['300'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`min-h-[100dvh] ${lexend.className}`}>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
