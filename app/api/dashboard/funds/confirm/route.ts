// app/api/dashboard/funds/confirm/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { getFundsByIdForUser, markFundsCompleted } from '@/lib/db/queries/funds';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as any,
});

export const POST = withAuthRoute(async (req, { auth }) => {
  const user = auth.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON_BODY' }, { status: 400 });
  }

  const sessionId = (body as { sessionId?: string }).sessionId;
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'SESSION_ID_REQUIRED' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (!session || session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'PAYMENT_NOT_COMPLETED' }, { status: 400 });
  }

  const metadata = session.metadata ?? {};
  const fundsId = metadata.fundsId;
  const metaUserId = metadata.userId;

  if (!fundsId || !metaUserId) {
    return NextResponse.json({ error: 'MISSING_SESSION_METADATA' }, { status: 400 });
  }

  if (String(user.id) !== String(metaUserId)) {
    return NextResponse.json({ error: 'USER_MISMATCH' }, { status: 403 });
  }

  const fundRow = await getFundsByIdForUser(Number(fundsId), user.id);
  if (!fundRow) {
    return NextResponse.json({ error: 'FUNDS_RECORD_NOT_FOUND' }, { status: 404 });
  }

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  await markFundsCompleted(fundRow.id, {
    transactionReference: paymentIntent ?? session.id,
  });

  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
