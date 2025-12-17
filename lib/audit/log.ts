import type { NextRequest } from 'next/server';
import { logActivity } from '@/lib/db/queries';
import { getRequestIp, getUserAgent } from './request';

export async function audit(
  req: NextRequest,
  userId: number | null,
  action: string,
  metadata?: Record<string, unknown>
) {
  return logActivity({
    userId,
    action,
    ipAddress: getRequestIp(req),
    userAgent: getUserAgent(req),
    metadata: metadata ?? null,
  });
}
