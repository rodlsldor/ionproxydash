// app/dashboard/page.tsx
import { requireUserPage } from '@/lib/auth/user';
import DashboardOverviewClient from './DashboardOverviewClient';

export default async function DashboardPage() {
  await requireUserPage();

  return <DashboardOverviewClient />;
}
