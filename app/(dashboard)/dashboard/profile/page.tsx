// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth/user';
import ProfilePage from './ProfileClient';

export default async function DashboardPage() {
  await requireUser();

  return <ProfilePage />;
}