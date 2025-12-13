// app/api/dashboard/subs/route.ts
import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { apiError, apiSuccess } from '@/lib/api/response';

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
  const subs = await getUserSubscriptions(auth.user.id);

  return apiSuccess(
    { subscriptions: subs },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

/* ============================
 * POST /api/dashboard/subs
 * ============================ */
export const POST = withAuthRoute(async (req, { auth }) => {
  const body = await req.json().catch(() => null);
  if (!body) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid JSON body',
      { reason: 'INVALID_JSON_BODY' }
    );
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
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid proxyId',
      { field: 'proxyId', reason: 'INVALID_PROXY_ID', value: proxyId }
    );
  }

  if (typeof priceMonthly !== 'number' || !Number.isFinite(priceMonthly) || priceMonthly <= 0) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid priceMonthly',
      { field: 'priceMonthly', reason: 'INVALID_PRICE_MONTHLY', value: priceMonthly }
    );
  }

  if (paymentMethod !== 'stripe' && paymentMethod !== 'wallet') {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid paymentMethod',
      { field: 'paymentMethod', reason: 'INVALID_PAYMENT_METHOD', value: paymentMethod }
    );
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

    return apiSuccess(
      { subscription, allocation },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    // On ne leak pas d'infos inutiles, mais on garde un details technique
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof Error && err.message === 'Proxy is not available') {
      return apiError(
        'VALIDATION_ERROR',
        409,
        'Proxy not available',
        { reason: 'PROXY_NOT_AVAILABLE', proxyId }
      );
    }

    console.error('[POST /api/dashboard/subs] error', err);
    return apiError(
      'INTERNAL',
      500,
      'Failed to create subscription',
      { reason: 'FAILED_TO_CREATE_SUBSCRIPTION', message }
    );
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
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Missing id',
      { field: 'id', reason: 'MISSING_ID' }
    );
  }

  const subscriptionId = Number(idParam);
  if (Number.isNaN(subscriptionId)) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid id',
      { field: 'id', reason: 'INVALID_ID', value: idParam }
    );
  }

  const atPeriodEnd =
    atPeriodEndParam === null ? true : atPeriodEndParam !== 'false';

  const sub = await getSubscriptionById(subscriptionId);

  // 404 si pas trouvé OU pas à l'user (pas de leak d'existence)
  if (!sub || sub.userId !== auth.user.id) {
    return apiError(
      'NOT_FOUND',
      404,
      'Subscription not found',
      { reason: 'SUBSCRIPTION_NOT_FOUND', subscriptionId }
    );
  }

  const updated = await cancelSubscription(subscriptionId, { atPeriodEnd });

  return apiSuccess(
    { subscription: updated },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
