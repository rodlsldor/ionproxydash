// app/(dashboard)/dashboard/DashboardShell.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { User, Smartphone, Repeat, FileQuestion, Wallet, Newspaper, Menu } from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', icon: User, label: 'Overview' },
  { href: '/dashboard/proxies', icon: Smartphone, label: 'My Proxies' },
  { href: '/dashboard/subs', icon: Repeat, label: 'Subscriptions' },
  { href: '/dashboard/help', icon: FileQuestion, label: 'Help Center' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
  { href: '/dashboard/funds', icon: Wallet, label: 'Funds' },
  { href: '/dashboard/billing', icon: Newspaper, label: 'Billings' },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider className="bg-sidebar">
      <Sidebar className="bg-sidebar">
        <SidebarHeader className="px-4 py-3">
          <Image
            src="/images/Logo-Ion-Proxy.png"
            alt="Ion Proxy Logo"
            width={200}
            height={200}
          />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        className="rounded-2xl transition transition-duration-1000 ease-in-out"
                        asChild
                        isActive={isActive}
                      >
                        <Link href={item.href}>
                          <item.icon className="mr-2 h-4 w-4" />
                          <span className="text-md">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-4 py-3">
          <Button variant="outline" className="w-full rounded-2xl text-sm">
            Logout
          </Button>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger>
            <Menu className="h-6 w-6" />
          </SidebarTrigger>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
