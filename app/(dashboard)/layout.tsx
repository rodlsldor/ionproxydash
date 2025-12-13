'use client';

import { useState } from 'react';
import Link from 'next/link';

import { signOut as nextAuthSignOut } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';

import { apiFetcher } from '@/lib/api/fetcher';
import useSWR from 'swr';


function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data, error, isLoading } = useSWR<{ user: {
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  } }>("/api/layout", apiFetcher);

  if (isLoading) return null;

  // pas connecté -> 401 -> on affiche Pricing + Sign in
  if (error) {
    return (
      <>
        <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Pricing
        </Link>
        <Button asChild className="rounded-full">
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </>
    );
  }

  const user = data?.user;
  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await nextAuthSignOut({ callbackUrl: "/" });
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage
            src={user?.avatarUrl ?? undefined}
            alt={user?.name || user?.email || "Profile"}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          {user?.email}
        </div>

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <button type="button" onClick={handleSignOut} className="flex w-full">
          <DropdownMenuItem className="w-full flex-1 cursor-pointer text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  return (
    <header className="border-b">
      <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href='/'>
          <Image
            src="/images/Logo-Ion-Proxy.png"
            alt="Ion Proxy Logo"
            width={150}
            height={50}
            priority
          />
        </a>
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
