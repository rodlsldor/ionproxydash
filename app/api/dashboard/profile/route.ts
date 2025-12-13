// app/api/dashboard/profile/route.ts
import { NextResponse } from 'next/server';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import {
  getKycStatusForUser,
  getLatestIdentityVerificationForUser,
} from '@/lib/db/queries';

export const GET = withAuthRoute(async (_req, { auth }) => {
  const user = auth.user;

  const [kycStatus, latestKyc] = await Promise.all([
    getKycStatusForUser(user.id),
    getLatestIdentityVerificationForUser(user.id),
  ]);

  const {
    passwordHash,
    failedLoginAttempts,
    accountLockedUntil,
    lastLoginIp,
    ...safeUser
  } = user;

  return NextResponse.json(
    {
      user: safeUser,
      kyc: kycStatus,
      latestIdentityVerification: latestKyc,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
