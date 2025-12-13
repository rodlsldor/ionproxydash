// app/(dashboard)/dashboard/layout.tsx
import DashboardShell from './DashboardShell';
import { requireUserPage } from '@/lib/auth/user';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUserPage();
  return <DashboardShell>{children}</DashboardShell>;
}
