// app/api/dashboard/funds/checkout/route.ts
import Stripe from 'stripe';
import { z } from 'zod';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { createPendingTopup } from '@/lib/db/queries/funds';
import { apiError, apiSuccess } from '@/lib/api/response';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as any,
});

/* =========================
 * ZOD SCHEMA
 * ========================= */

const checkoutSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .finite()
    .min(70, { message: 'Amount must be at least 70' })
    .max(1000, { message: 'Amount must be at most 1000' }),
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

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];

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

  const { amount } = parsed.data;
  const currency = 'USD';

  const fundRow = await createPendingTopup({
    userId: auth.user.id,
    amount,
    currency,
    metadata: { source: 'wallet_topup' },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://31.97.153.123:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: 'Wallet top-up' },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    customer_email: auth.user.email ?? undefined,
    metadata: {
      userId: String(auth.user.id),
      fundsId: String(fundRow.id),
      type: 'wallet_topup',
    },
    success_url: `${baseUrl}/dashboard/funds?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/funds?status=cancelled`,
  });

  if (!session.url) {
    return apiError(
      'INTERNAL',
      500,
      'Checkout session URL missing',
      { reason: 'CHECKOUT_SESSION_URL_MISSING' }
    );
  }

  return apiSuccess(
    { url: session.url },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
