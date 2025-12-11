// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth/user';
import FundsPage from './FundsClient';

export default async function DashboardPage() {
  await requireUser();

  return <FundsPage />;
}