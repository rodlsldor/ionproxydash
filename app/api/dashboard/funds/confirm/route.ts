// app/api/dashboard/funds/confirm/route.ts
import Stripe from 'stripe';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { getFundsByIdForUser, markFundsCompleted } from '@/lib/db/queries/funds';
import { apiError, apiSuccess } from '@/lib/api/response';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as any,
});

export const POST = withAuthRoute(async (req, { auth }) => {
  const user = auth.user;

  const body = await req.json().catch(() => null);
  if (!body) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid JSON body',
      { reason: 'INVALID_JSON_BODY' }
    );
  }

  const sessionId = (body as { sessionId?: string }).sessionId;
  if (!sessionId || typeof sessionId !== 'string') {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'sessionId is required',
      { field: 'sessionId', reason: 'SESSION_ID_REQUIRED' }
    );
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (!session || session.payment_status !== 'paid') {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Payment not completed',
      { reason: 'PAYMENT_NOT_COMPLETED', sessionId }
    );
  }

  const metadata = session.metadata ?? {};
  const fundsId = metadata.fundsId;
  const metaUserId = metadata.userId;

  if (!fundsId || !metaUserId) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Missing checkout session metadata',
      { reason: 'MISSING_SESSION_METADATA', metadata }
    );
  }

  if (String(user.id) !== String(metaUserId)) {
    return apiError(
      'FORBIDDEN',
      403,
      'User mismatch',
      { reason: 'USER_MISMATCH', metaUserId, userId: String(user.id) }
    );
  }

  const fundRow = await getFundsByIdForUser(Number(fundsId), user.id);
  if (!fundRow) {
    return apiError(
      'NOT_FOUND',
      404,
      'Funds record not found',
      { reason: 'FUNDS_RECORD_NOT_FOUND', fundsId: Number(fundsId) }
    );
  }

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  await markFundsCompleted(fundRow.id, {
    transactionReference: paymentIntent ?? session.id,
  });

  return apiSuccess(
    { confirmed: true, fundsId: fundRow.id },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
