// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth/user';
import ProxiesPage from './ProxiesClient';

export default async function DashboardPage() {
  await requireUser();

  return <ProxiesPage />;
}