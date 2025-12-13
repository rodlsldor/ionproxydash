// app/api/layout/route.ts
import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { apiSuccess } from '@/lib/api/response';

export const GET = withAuthRoute(async (_req, { auth }) => {
  const user = auth.user;

  return apiSuccess(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
