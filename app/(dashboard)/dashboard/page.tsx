// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth/user';
import DashboardOverviewClient from './DashboardOverviewClient';

export default async function DashboardPage() {
  await requireUser();

  return <DashboardOverviewClient />;
}
