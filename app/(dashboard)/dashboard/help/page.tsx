// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth/user';
import HelpPage from './HelpClient';

export default async function DashboardPage() {
  await requireUser();

  return <HelpPage />;
}