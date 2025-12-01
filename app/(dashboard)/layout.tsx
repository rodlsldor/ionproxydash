'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { signOut } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import Image from 'next/image';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Link
          href="/pricing"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Pricing
        </Link>
        <Button asChild className="rounded-full">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </>
    );
  }

  const initials = (user.name || user.email || '?')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          {/* Tu pourras brancher user.image ici si tu l’as en BDD */}
          <AvatarImage alt={user.name || user.email || ''} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  return (
    <header className="border-b">
      <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Image
          src="/images/Logo-Ion-Proxy.png"
          alt="Ion Proxy Logo"
          width={150}
          height={50}
          priority
        />
        <div className="flex items-center space-x-4">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-[100dvh] flex-col">
      <Header />
      {children}
    </section>
  );
}
