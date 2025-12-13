// lib/auth/withAuthRoute.ts
import { AuthError, requireAuth, type AuthContext } from './guard';
import { apiError } from '@/lib/api/response';

type Handler = (req: Request, ctx: { auth: AuthContext }) => Promise<Response> | Response;

export function withAuthRoute(handler: Handler) {
  return async (req: Request): Promise<Response> => {
    try {
      const auth = await requireAuth();
      return await handler(req, { auth });
    } catch (err) {
      if (err instanceof AuthError) {
        // Mapping stable -> ton contrat API
        const code =
          err.status === 401 ? "UNAUTHORIZED" :
          err.status === 403 ? "FORBIDDEN" :
          "INTERNAL";

        return apiError(
          code,
          err.status,
          err.failure,
          err.reason ? { reason: err.reason } : undefined
        );
      }

      console.error(err);
      return apiError("INTERNAL", 500, "Internal server error");
    }
  };
}
