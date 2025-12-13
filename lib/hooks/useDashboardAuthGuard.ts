// lib/hooks/useDashboardAuthGuard.ts
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/fetcher';

export function useDashboardAuthGuard(error: unknown) {
  const router = useRouter();

  React.useEffect(() => {
    if (!error) return;

    const e = error as ApiError;

    if (e.status === 401) {
      router.replace('/'); // ou /auth/signin
      return;
    }

    if (e.status === 403 && e.data?.error === 'FORBIDDEN') {
      router.replace('/account/locked');
    }
  }, [error, router]);
}
