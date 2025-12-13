// lib/auth/user.ts
import { redirect } from 'next/navigation';
import { AuthError, requireAuth, type AuthContext } from './guard';

export async function requireUserPage(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (e) {
    if (e instanceof AuthError) redirect('/');
    throw e;
  }
}
