// app/api/me/route.ts
import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/auth/withAuthRoute";

export const GET = withAuthRoute(async (_req, { auth }) => {
  const user = auth.user;

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
});
