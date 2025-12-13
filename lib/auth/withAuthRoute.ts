// lib/auth/withAuthRoute.ts
import { NextResponse } from 'next/server';
import { AuthError, requireAuth, type AuthContext } from './guard';

type Handler = (req: Request, ctx: { auth: AuthContext }) => Promise<Response> | Response;

export function withAuthRoute(handler: Handler) {
  return async (req: Request): Promise<Response> => {
    try {
      const auth = await requireAuth();
      return await handler(req, { auth });
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: err.code, ...(err.reason ? { reason: err.reason } : {}) },
          { status: err.status }
        );
      }

      console.error(err);
      return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
    }
  };
}
