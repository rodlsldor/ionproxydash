// lib/auth/guard.ts
import { auth } from '@/lib/next-auth';
import { getUserByEmail } from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';
import type { Session } from 'next-auth';

export type AuthErrorCode = 'UNAUTHORIZED' | 'USER_NOT_FOUND' | 'FORBIDDEN';
export type ForbiddenReason = 'SUSPENDED' | 'SOFT_DELETED';

export class AuthError extends Error {
  code: AuthErrorCode;
  status: 401 | 403;
  reason?: ForbiddenReason;

  constructor(opts: { code: AuthErrorCode; status: 401 | 403; reason?: ForbiddenReason }) {
    super(opts.code);
    this.code = opts.code;
    this.status = opts.status;
    this.reason = opts.reason;
  }
}

export type AuthContext = {
  session: Session; // ✅ IMPORTANT : pas ReturnType<typeof auth>
  user: User;
};

function assertActiveUser(user: User) {
  if (user.deletedAt) {
    throw new AuthError({ code: 'FORBIDDEN', status: 403, reason: 'SOFT_DELETED' });
  }
  // if (user.suspendedAt) throw new AuthError({ code: 'FORBIDDEN', status: 403, reason: 'SUSPENDED' });
}

export async function requireAuth(): Promise<AuthContext> {
  const session = await auth();

  const email = session?.user?.email;
  if (!session || !email) {
    throw new AuthError({ code: 'UNAUTHORIZED', status: 401 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    throw new AuthError({ code: 'USER_NOT_FOUND', status: 401 });
  }

  assertActiveUser(user);

  return { session, user };
}
