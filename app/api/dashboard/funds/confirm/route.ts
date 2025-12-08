// app/api/dashboard/funds/confirm/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getUser } from '@/lib/db/queries/users';
import {
  getFundsByIdForUser,
  markFundsCompleted,
} from '@/lib/db/queries/funds';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
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

  const sessionId = (body as { sessionId?: string }).sessionId;

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  // 1) Récupérer la session Checkout
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (!session || session.payment_status !== 'paid') {
    return NextResponse.json(
      { error: 'Payment not completed' },
      { status: 400 }
    );
  }

  const metadata = session.metadata ?? {};
  const fundsId = metadata.fundsId;
  const metaUserId = metadata.userId;

  if (!fundsId || !metaUserId) {
    return NextResponse.json(
      { error: 'Missing metadata on session' },
      { status: 400 }
    );
  }

  if (String(user.id) !== String(metaUserId)) {
    return NextResponse.json(
      { error: 'User mismatch' },
      { status: 403 }
    );
  }

  // 2) Vérifier que la ligne funds existe bien et appartient au user
  const fundRow = await getFundsByIdForUser(Number(fundsId), user.id);
  if (!fundRow) {
    return NextResponse.json(
      { error: 'Funds record not found' },
      { status: 404 }
    );
  }

  // 3) Marquer comme completed
  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  await markFundsCompleted(fundRow.id, {
    transactionReference: paymentIntent ?? session.id,
  });

  return NextResponse.json({ ok: true });
}
