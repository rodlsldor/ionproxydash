'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, Smartphone, Repeat, FileQuestion, LifeBuoy, Menu, Wallet, Newspaper} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', icon: User, label: 'Overview' },
    { href: '/dashboard/proxies', icon: Smartphone, label: 'My Proxies' },
    { href: '/dashboard/subs', icon: Repeat, label: 'Subscriptions' },
    { href: '/dashboard/help', icon: FileQuestion, label: 'Help Center' },
    { href: '/dashboard/supp', icon: LifeBuoy, label: 'Support' },
    { href: '/dashboard/profile', icon: User, label: 'Profile' },
    { href: '/dashboard/funds', icon: Wallet, label: 'Funds' },
    { href: '/dashboard/billing', icon: Newspaper, label: 'Billings' }
  ];

  const sidebarBaseClasses =
    'w-64 border-r bg-card border-border transform transition-transform duration-300 ease-in-out lg:relative lg:block lg:translate-x-0';
  const sidebarStateClasses = isSidebarOpen
    ? 'absolute inset-y-0 left-0 z-40 translate-x-0 block lg:block'
    : 'absolute inset-y-0 left-0 z-40 -translate-x-full lg:translate-x-0 hidden lg:block';

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] w-full">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b bg-card border-border p-4 lg:hidden">
        <div className="flex items-center">
          <span className="text-sm font-medium text-foreground">Settings</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarBaseClasses} ${sidebarStateClasses}`}>
          <nav className="h-full overflow-y-auto p-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="my-1 flex w-full justify-start shadow-none rounded-2xl"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
