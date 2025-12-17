import type { NextRequest } from 'next/server';

export function getRequestIp(req: NextRequest | Request): string | null {
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;

  // fallback parfois présent
  const xri = h.get('x-real-ip');
  if (xri) return xri.trim();

  return null;
}

export function getUserAgent(req: NextRequest | Request): string | null {
  return req.headers.get('user-agent');
}
