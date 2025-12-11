// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth/user';
import SecurityPage from './SecurityClient';

export default async function DashboardPage() {
  await requireUser();

  return <SecurityPage />;
}