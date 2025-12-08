// app/api/dashboard/funds/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getUser } from '@/lib/db/queries/users';
import { createPendingTopup } from '@/lib/db/queries/funds';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as any,
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const amount = (body as { amount?: number }).amount;

  // 1) Validation de base
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return NextResponse.json(
      { error: 'Invalid amount' },
      { status: 400 }
    );
  }

  // 2) Règle métier : min 70, max 1000
  if (amount < 70 || amount > 1000) {
    return NextResponse.json(
      { error: 'Amount must be between $70 and $1000' },
      { status: 400 }
    );
  }

  const currency = 'USD';

  // 3) Crée une ligne funds pending
  const fundRow = await createPendingTopup({
    userId: user.id,
    amount,
    currency,
    metadata: {
      source: 'wallet_topup',
    },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://31.97.153.123:3000';

  // 4) Crée la session Stripe Checkout
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: 'Wallet top-up',
          },
          unit_amount: Math.round(amount * 100), // cents
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
    return NextResponse.json(
      { error: 'Unable to create checkout session' },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
