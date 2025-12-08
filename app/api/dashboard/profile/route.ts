// app/api/dashboard/profile/route.ts
import { NextResponse } from 'next/server';

import { getUser } from '@/lib/db/queries';
import {
  getKycStatusForUser,
  getLatestIdentityVerificationForUser,
} from '@/lib/db/queries'; // adapte le chemin si besoin

export async function GET() {
  // 1. Récupération utilisateur via cookie
  const user = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. KYC
  const [kycStatus, latestKyc] = await Promise.all([
    getKycStatusForUser(user.id),
    getLatestIdentityVerificationForUser(user.id),
  ]);

  // 3. On enlève les champs sensibles
  const {
    passwordHash,
    failedLoginAttempts,
    accountLockedUntil,
    lastLoginIp,
    ...safeUser
  } = user;

  // 4. Réponse API
  return NextResponse.json({
    user: safeUser,
    kyc: kycStatus,
    latestIdentityVerification: latestKyc,
  });
}
