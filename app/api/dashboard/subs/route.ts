// app/api/dashboard/subs/route.ts
import { NextResponse } from 'next/server';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import {
  createSubscriptionForProxy,
  getUserSubscriptions,
  cancelSubscription,
  getSubscriptionById,
  type PaymentMethod,
} from '@/lib/db/queries';

/* ============================
 * GET /api/dashboard/subs
 * ============================ */
export const GET = withAuthRoute(async (_req, { auth }) => {
  try {
    const subs = await getUserSubscriptions(auth.user.id);

    return NextResponse.json(
      { subscriptions: subs },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[GET /dashboard/subs] error', err);
    return NextResponse.json(
      { error: 'FAILED_TO_FETCH_SUBSCRIPTIONS' },
      { status: 500 }
    );
  }
});

/* ============================
 * POST /api/dashboard/subs
 * ============================ */
export const POST = withAuthRoute(async (req, { auth }) => {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON_BODY' }, { status: 400 });
  }

  const {
    proxyId,
    priceMonthly,
    paymentMethod,
    currency,
    stripeSubscriptionId,
    stripePriceId,
    metadata,
  } = body as {
    proxyId?: number;
    priceMonthly?: number;
    paymentMethod?: PaymentMethod;
    currency?: string;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    metadata?: Record<string, unknown> | null;
  };

  if (typeof proxyId !== 'number' || Number.isNaN(proxyId)) {
    return NextResponse.json({ error: 'INVALID_PROXY_ID' }, { status: 400 });
  }

  if (typeof priceMonthly !== 'number' || priceMonthly <= 0) {
    return NextResponse.json({ error: 'INVALID_PRICE_MONTHLY' }, { status: 400 });
  }

  if (paymentMethod !== 'stripe' && paymentMethod !== 'wallet') {
    return NextResponse.json({ error: 'INVALID_PAYMENT_METHOD' }, { status: 400 });
  }

  try {
    const { subscription, allocation } = await createSubscriptionForProxy({
      userId: auth.user.id,
      proxyId,
      priceMonthly,
      currency,
      paymentMethod,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
      stripePriceId: stripePriceId ?? null,
      metadata: metadata ?? null,
    });

    return NextResponse.json(
      { subscription, allocation },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('[POST /dashboard/subs] error', err);

    if (err instanceof Error && err.message === 'Proxy is not available') {
      return NextResponse.json({ error: 'PROXY_NOT_AVAILABLE' }, { status: 409 });
    }

    return NextResponse.json({ error: 'FAILED_TO_CREATE_SUBSCRIPTION' }, { status: 500 });
  }
});

/* ============================
 * DELETE /api/dashboard/subs?id=123&atPeriodEnd=true|false
 * ============================ */
export const DELETE = withAuthRoute(async (req, { auth }) => {
  const { searchParams } = new URL(req.url);

  const idParam = searchParams.get('id');
  const atPeriodEndParam = searchParams.get('atPeriodEnd');

  if (!idParam) {
    return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 });
  }

  const subscriptionId = Number(idParam);
  if (Number.isNaN(subscriptionId)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }

  const atPeriodEnd =
    atPeriodEndParam === null
      ? true
      : atPeriodEndParam !== 'false';

  try {
    const sub = await getSubscriptionById(subscriptionId);

    // 404 si pas trouvé OU pas à l'user (pas de leak d'existence)
    if (!sub || sub.userId !== auth.user.id) {
      return NextResponse.json({ error: 'SUBSCRIPTION_NOT_FOUND' }, { status: 404 });
    }

    const updated = await cancelSubscription(subscriptionId, { atPeriodEnd });

    return NextResponse.json(
      { subscription: updated },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[DELETE /dashboard/subs] error', err);
    return NextResponse.json({ error: 'FAILED_TO_CANCEL_SUBSCRIPTION' }, { status: 500 });
  }
});
