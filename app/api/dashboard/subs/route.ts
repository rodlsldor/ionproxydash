// app/api/dashboard/subs/route.ts

import { NextResponse } from 'next/server';

import { getUser } from '@/lib/db/queries/users';
import {
  createSubscriptionForProxy,
  getUserSubscriptions,
  cancelSubscription,
  getSubscriptionById,
  type PaymentMethod,
} from '@/lib/db/queries';

/* ============================
 * GET /api/dashboard/subs
 * → Retourne les abonnements de l'utilisateur
 * ============================ */

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subs = await getUserSubscriptions(user.id);
    return NextResponse.json({ subscriptions: subs });
  } catch (err) {
    console.error('[GET /subs] error', err);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

/* ============================
 * POST /api/dashboard/subs
 * → Crée un abonnement + allocation pour un proxy
 * body JSON :
 * {
 *   proxyId: number;
 *   priceMonthly: number;
 *   paymentMethod: 'stripe' | 'wallet';
 *   currency?: string;
 *   stripeSubscriptionId?: string | null;
 *   stripePriceId?: string | null;
 *   metadata?: Record<string, unknown> | null;
 * }
 * ============================ */

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

  // Validations basiques
  if (typeof proxyId !== 'number' || Number.isNaN(proxyId)) {
    return NextResponse.json(
      { error: 'proxyId must be a valid number' },
      { status: 400 }
    );
  }

  if (typeof priceMonthly !== 'number' || priceMonthly <= 0) {
    return NextResponse.json(
      { error: 'priceMonthly must be a positive number' },
      { status: 400 }
    );
  }

  if (paymentMethod !== 'stripe' && paymentMethod !== 'wallet') {
    return NextResponse.json(
      { error: 'paymentMethod must be "stripe" or "wallet"' },
      { status: 400 }
    );
  }

  try {
    const { subscription, allocation } = await createSubscriptionForProxy({
      userId: user.id,
      proxyId,
      priceMonthly,
      currency, // par défaut 'USD' est géré dans la fonction
      paymentMethod,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
      stripePriceId: stripePriceId ?? null,
      metadata: metadata ?? null,
    });

    return NextResponse.json(
      { subscription, allocation },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[POST /subs] error', err);

    // petit message plus précis si c'est un problème de disponibilité proxy
    if (err instanceof Error && err.message === 'Proxy is not available') {
      return NextResponse.json(
        { error: 'Proxy is not available' },
        { status: 409 } // 409 Conflict
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

/* ============================
 * DELETE /api/dashboard/subs?id=123&atPeriodEnd=true|false
 * → Annule un abonnement de l'utilisateur
 *   - atPeriodEnd omitted ou true  → annulation à la fin de période
 *   - atPeriodEnd=false            → annulation immédiate
 * ============================ */

export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get('id');
  const atPeriodEndParam = searchParams.get('atPeriodEnd');

  if (!idParam) {
    return NextResponse.json(
      { error: 'Missing "id" query parameter' },
      { status: 400 }
    );
  }

  const subscriptionId = Number(idParam);
  if (Number.isNaN(subscriptionId)) {
    return NextResponse.json(
      { error: '"id" must be a valid number' },
      { status: 400 }
    );
  }

  const atPeriodEnd =
    atPeriodEndParam === null
      ? true // défaut : annulation en fin de période
      : atPeriodEndParam !== 'false';

  try {
    // On vérifie que l'abo appartient bien à l'utilisateur
    const sub = await getSubscriptionById(subscriptionId);
    if (!sub || sub.userId !== user.id) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const updated = await cancelSubscription(subscriptionId, { atPeriodEnd });

    return NextResponse.json({ subscription: updated });
  } catch (err) {
    console.error('[DELETE /subs] error', err);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
