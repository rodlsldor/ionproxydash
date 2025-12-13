// lib/auth/guard.ts
import { auth } from '@/lib/next-auth';
import { getUserByEmail } from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';
import type { Session } from 'next-auth';

// Codes internes (pas les codes API stables)
export type AuthFailureCode =
  | 'MISSING_SESSION'
  | 'MISSING_EMAIL'
  | 'USER_NOT_FOUND'
  | 'SOFT_DELETED'
  | 'SUSPENDED';

export type ForbiddenReason = 'SUSPENDED' | 'SOFT_DELETED';

export class AuthError extends Error {
  failure: AuthFailureCode;
  status: 401 | 403;
  reason?: ForbiddenReason;

  constructor(opts: {
    failure: AuthFailureCode;
    status: 401 | 403;
    reason?: ForbiddenReason;
  }) {
    super(opts.failure);
    this.failure = opts.failure;
    this.status = opts.status;
    this.reason = opts.reason;
  }
}

export type AuthContext = {
  session: Session; // IMPORTANT : pas ReturnType<typeof auth>
  user: User;
};

function assertActiveUser(user: User) {
  if (user.deletedAt) {
    throw new AuthError({
      failure: 'SOFT_DELETED',
      status: 403,
      reason: 'SOFT_DELETED',
    });
  }

  // Si tu ajoutes suspendedAt plus tard :
  // if (user.suspendedAt) {
  //   throw new AuthError({ failure: 'SUSPENDED', status: 403, reason: 'SUSPENDED' });
  // }
}

export async function requireAuth(): Promise<AuthContext> {
  const session = await auth();

  if (!session) {
    throw new AuthError({ failure: 'MISSING_SESSION', status: 401 });
  }

  const email = session.user?.email;
  if (!email) {
    throw new AuthError({ failure: 'MISSING_EMAIL', status: 401 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    // 401 pour ne pas révéler si l'email existe
    throw new AuthError({ failure: 'USER_NOT_FOUND', status: 401 });
  }

  assertActiveUser(user);

  return { session, user };
}
