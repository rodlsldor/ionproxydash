// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth/user';
import BillingPage from './BillingClient';

export default async function DashboardPage() {
  await requireUser();

  return <BillingPage />;
}