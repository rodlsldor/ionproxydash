// lib/auth/user.ts
import { redirect } from 'next/navigation';
import { auth } from '@/lib/next-auth';
import { getUserByEmail } from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';

// Récupère l'user ou null depuis la session Auth.js
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await getUserByEmail(session.user.email);
  return user ?? null;
}

/**
 * 🔐 Pour les pages / layouts / server components
 * - Si pas connecté → redirect('/')
 * - Sinon → User Drizzle
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/'); // redirection côté serveur
  }
  return user;
}

/**
 * 🔐 Pour les routes API
 * - Si pas connecté → `null` (la route retourne 401)
 * - Sinon → User Drizzle
 */
export async function requireUserApi(): Promise<User | null> {
  return getCurrentUser();
}
