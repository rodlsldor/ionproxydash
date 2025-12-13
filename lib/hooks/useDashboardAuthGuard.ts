// lib/hooks/useDashboardAuthGuard.ts
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/fetcher';

export function useDashboardAuthGuard(error: unknown) {
  const router = useRouter();

  React.useEffect(() => {
    if (!error) return;

    if (!(error instanceof ApiError)) return;

    // Auth expirée / non connecté
    if (error.code === 'UNAUTHORIZED') {
      router.replace('/'); // ou /auth/signin
      return;
    }

    // Compte bloqué / supprimé
    if (error.code === 'FORBIDDEN') {
      router.replace('/account/locked');
      return;
    }
  }, [error, router]);
}
