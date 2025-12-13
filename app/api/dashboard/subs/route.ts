import { z } from 'zod';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { apiError, apiSuccess } from '@/lib/api/response';

import {
  createSubscriptionForProxy,
  getUserSubscriptions,
  cancelSubscription,
  getSubscriptionById,
} from '@/lib/db/queries';

/* ============================
 * SCHEMAS
 * ============================ */

const createSubscriptionSchema = z
  .object({
    proxyId: z.number().int().positive(),
    priceMonthly: z.number().positive(),
    paymentMethod: z.enum(['stripe', 'wallet']),
    currency: z.literal('USD'),
    stripeSubscriptionId: z.string().nullable().optional(),
    stripePriceId: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

const deleteSubscriptionSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    atPeriodEnd: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v !== 'false'),
  })
  .strict();

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
  const json = await req.json().catch(() => null);
  if (!json) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid JSON body',
      { reason: 'INVALID_JSON_BODY' }
    );
  }

  const parsed = createSubscriptionSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid input',
      {
        reason: 'INVALID_INPUT',
        zod: parsed.error.flatten(),
        issues: parsed.error.issues,
      }
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
  } = parsed.data;

  try {
    const { subscription, allocation } =
      await createSubscriptionForProxy({
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
  } catch (err) {
    if (err instanceof Error && err.message === 'Proxy is not available') {
      return apiError(
        'VALIDATION_ERROR',
        409,
        'Proxy not available',
        { reason: 'PROXY_NOT_AVAILABLE', proxyId }
      );
    }

    console.error('[POST /api/dashboard/subs]', err);

    return apiError(
      'INTERNAL',
      500,
      'Failed to create subscription',
      { reason: 'FAILED_TO_CREATE_SUBSCRIPTION' }
    );
  }
});

/* ============================
 * DELETE /api/dashboard/subs?id=123&atPeriodEnd=true|false
 * ============================ */
export const DELETE = withAuthRoute(async (req, { auth }) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);

  const parsed = deleteSubscriptionSchema.safeParse(params);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid query parameters',
      {
        reason: 'INVALID_QUERY',
        zod: parsed.error.flatten(),
        issues: parsed.error.issues,
      }
    );
  }

  const { id: subscriptionId, atPeriodEnd } = parsed.data;

  const sub = await getSubscriptionById(subscriptionId);

  // Pas de leak d'existence
  if (!sub || sub.userId !== auth.user.id) {
    return apiError(
      'NOT_FOUND',
      404,
      'Subscription not found',
      { reason: 'SUBSCRIPTION_NOT_FOUND', subscriptionId }
    );
  }

  const updated = await cancelSubscription(subscriptionId, {
    atPeriodEnd,
  });

  return apiSuccess(
    { subscription: updated },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
