// app/api/dashboard/funds/confirm/route.ts
import Stripe from 'stripe';
import { z } from 'zod';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import {
  getFundsByIdForUser,
  markFundsCompleted,
} from '@/lib/db/queries/funds';
import { apiError, apiSuccess } from '@/lib/api/response';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as any,
});

/* =========================
 * ZOD SCHEMAS
 * ========================= */

// Body attendu depuis le frontend
const confirmSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});

// Metadata Stripe attendue (SOURCE DE VÉRITÉ)
const stripeMetadataSchema = z.object({
  fundsId: z.string().regex(/^\d+$/, 'Invalid fundsId'),
  userId: z.string().regex(/^\d+$/, 'Invalid userId'),
});

/* =========================
 * ROUTE
 * ========================= */

export const POST = withAuthRoute(async (req, { auth }) => {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid JSON body',
      { reason: 'INVALID_JSON_BODY' }
    );
  }

  const parsedBody = confirmSchema.safeParse(body);
  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid input',
      {
        field: issue.path[0],
        message: issue.message,
      }
    );
  }

  const { sessionId } = parsedBody.data;

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (!session || session.payment_status !== 'paid') {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Payment not completed',
      {
        reason: 'PAYMENT_NOT_COMPLETED',
        sessionId,
        paymentStatus: session?.payment_status ?? null,
      }
    );
  }

  const metadataParse = stripeMetadataSchema.safeParse(session.metadata);
  if (!metadataParse.success) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid Stripe session metadata',
      {
        reason: 'INVALID_SESSION_METADATA',
        issues: metadataParse.error.issues,
        metadata: session.metadata,
      }
    );
  }

  const { fundsId, userId: metaUserId } = metadataParse.data;

  if (String(auth.user.id) !== metaUserId) {
    return apiError(
      'FORBIDDEN',
      403,
      'User mismatch',
      {
        reason: 'USER_MISMATCH',
        authUserId: String(auth.user.id),
        metaUserId,
      }
    );
  }

  const fundRow = await getFundsByIdForUser(Number(fundsId), auth.user.id);
  if (!fundRow) {
    return apiError(
      'NOT_FOUND',
      404,
      'Funds record not found',
      {
        reason: 'FUNDS_RECORD_NOT_FOUND',
        fundsId: Number(fundsId),
      }
    );
  }

  // Stripe payment reference (idempotence / audit)
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

  await markFundsCompleted(fundRow.id, {
    transactionReference: paymentIntentId,
  });

  return apiSuccess(
    {
      confirmed: true,
      fundsId: fundRow.id,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
});
