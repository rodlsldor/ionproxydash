// app/api/dashboard/funds/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { createPendingTopup } from '@/lib/db/queries/funds';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is not set');

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as any,
});

export const POST = withAuthRoute(async (req, { auth }) => {
  const user = auth.user;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'INVALID_JSON_BODY' }, { status: 400 });

  const amount = (body as { amount?: number }).amount;

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return NextResponse.json({ error: 'INVALID_AMOUNT' }, { status: 400 });
  }
  if (amount < 70 || amount > 1000) {
    return NextResponse.json({ error: 'AMOUNT_OUT_OF_RANGE' }, { status: 400 });
  }

  const currency = 'USD';

  const fundRow = await createPendingTopup({
    userId: user.id,
    amount,
    currency,
    metadata: { source: 'wallet_topup' },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://31.97.153.123:3000';

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
    customer_email: user.email ?? undefined,
    metadata: {
      userId: String(user.id),
      fundsId: String(fundRow.id),
      type: 'wallet_topup',
    },
    success_url: `${baseUrl}/dashboard/funds?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/funds?status=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'CHECKOUT_SESSION_URL_MISSING' }, { status: 500 });
  }

  return NextResponse.json(
    { url: session.url },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
