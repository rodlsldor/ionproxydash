/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  inArray,
  isNull,
} from 'drizzle-orm';

/* ======================
 * DATABASE INSTANCE
 * ====================== */

import { db } from '../drizzle';

/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

import {
  subscriptions,
  proxyAllocations,
  proxies,
  billing,
  type Subscription,
  type NewSubscription,
  type ProxyAllocation,
} from '../schema';

import { isProxyAvailable } from './allocations';

export type PaymentMethod = 'stripe' | 'wallet';
export type SubscriptionStatus = Subscription['status'];

export type CreateSubscriptionInput = {
  userId: number;
  amountMonthly: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: SubscriptionStatus; // optionnel, sinon on déduit
};

/* ======================
 * SUBSCRIPTIONS
 * ====================== */

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<Subscription> {
  const {
    userId,
    amountMonthly,
    currency = 'USD',
    paymentMethod,
    stripeSubscriptionId = null,
    stripePriceId = null,
    metadata = null,
    status,
  } = input;

  if (amountMonthly <= 0) {
    throw new Error('amountMonthly must be positive');
  }

  const now = new Date();

  // Si Stripe : on peut considérer l’abonnement comme "incomplete"
  // jusqu’à confirmation du premier paiement
  const resolvedStatus: SubscriptionStatus =
    status ??
    (paymentMethod === 'wallet'
      ? 'active'
      : 'incomplete'); // à adapter à ton goût

  const [row] = await db
    .insert(subscriptions)
    .values({
      userId,
      paymentMethod,
      status: resolvedStatus,
      amountMonthly,
      currency,
      stripeSubscriptionId,
      stripePriceId,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAt: null,
      canceledAt: null,
      metadata,
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<NewSubscription, 'id'>)
    .returning();

  return row;
}

/* =======================
 * ABONNEMENTS + ALLOCATIONS
 * ======================== */

export type CreateSubscriptionForProxyInput = {
  userId: number;
  proxyId: number;
  priceMonthly: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Crée un abonnement ET alloue le proxy lié à cet abonnement.
 *  - vérifie la dispo du proxy
 *  - crée la ligne subscription
 *  - crée la proxyAllocation liée (avec subscriptionId)
 *  - marque le proxy comme "allocated"
 */
export async function createSubscriptionForProxy(
  input: CreateSubscriptionForProxyInput
): Promise<{ subscription: Subscription; allocation: ProxyAllocation }> {
  const {
    userId,
    proxyId,
    priceMonthly,
    currency = 'USD',
    paymentMethod,
    stripeSubscriptionId = null,
    stripePriceId = null,
    metadata = null,
  } = input;

  if (priceMonthly <= 0) {
    throw new Error('priceMonthly must be positive');
  }

  // 1. proxy dispo ?
  const available = await isProxyAvailable(proxyId);
  if (!available) {
    throw new Error('Proxy is not available');
  }

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + 30);

  // 2. crée l’abonnement
  const subscription = await createSubscription({
    userId,
    amountMonthly: priceMonthly,
    currency,
    paymentMethod,
    stripeSubscriptionId,
    stripePriceId,
    metadata,
  });

  // 3. crée l’allocation liée à cet abo
  const [allocation] = await db
    .insert(proxyAllocations)
    .values({
      userId,
      proxyId,
      startsAt: now,
      endsAt,
      status: 'active',
      priceMonthly: priceMonthly,
      subscriptionId: subscription.id,
      createdAt: now,
    } satisfies Omit<ProxyAllocation, 'id'>)
    .returning();

  // 4. marque le proxy comme alloué
  await db
    .update(proxies)
    .set({ status: 'allocated' })
    .where(eq(proxies.id, proxyId));

  return { subscription, allocation };
}

// ===========
// Lectures
// ===========

export async function getSubscriptionById(
  subscriptionId: number
): Promise<Subscription | null> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId));

  return row ?? null;
}

export async function getUserSubscriptions(
  userId: number
): Promise<Subscription[]> {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
}

// ===========
// Annulation
// ===========

export type CancelSubscriptionOptions = {
  /**
   * true  => on laisse courir jusqu’à la fin de période (cancelAt)
   * false => on annule immédiatement, on coupe les allocations
   */
  atPeriodEnd?: boolean;
};

/**
 * Annule un abonnement.
 *  - atPeriodEnd = true  => on marque cancelAt, on laisse l’alloc active jusqu’à la date
 *  - atPeriodEnd = false => on passe en "canceled", on coupe les allocations actives et libère les proxies
 */
export async function cancelSubscription(
  subscriptionId: number,
  options?: CancelSubscriptionOptions
): Promise<Subscription | null> {
  const atPeriodEnd = options?.atPeriodEnd ?? true;
  const now = new Date();

  const sub = await getSubscriptionById(subscriptionId);
  if (!sub) {
    return null;
  }

  // 1. maj statut abonnement
  let updatedStatus: SubscriptionStatus = 'canceled';

  const patch: Partial<Subscription> = {
    updatedAt: now,
  };

  if (atPeriodEnd) {
    // on marque pour annulation en fin de période
    patch.cancelAt = sub.currentPeriodEnd ?? null;
    updatedStatus = 'active'; // reste actif jusque là
  } else {
    patch.canceledAt = now;
    updatedStatus = 'canceled';
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      ...patch,
      status: updatedStatus,
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  // 2. si annulation immédiate : on coupe les allocations actives + libère les proxies
  if (!atPeriodEnd) {
    const activeAllocations = await db
      .update(proxyAllocations)
      .set({
        status: 'expired',
        endsAt: now,
      })
      .where(
        and(
          eq(proxyAllocations.subscriptionId, subscriptionId),
          eq(proxyAllocations.status, 'active')
        )
      )
      .returning({
        proxyId: proxyAllocations.proxyId,
      });

    const proxyIds = activeAllocations.map((a) => a.proxyId);
    if (proxyIds.length > 0) {
      await db
        .update(proxies)
        .set({ status: 'available' })
        .where(inArray(proxies.id, proxyIds));
    }
  }

  return updated ?? null;
}

// ============================
// (Optionnel) Lier billing <-> subscription
// ============================

/**
 * Récupère toutes les factures associées à un abonnement.
 * Utile pour un onglet "Historique" dans ton dashboard.
 */
export async function getSubscriptionInvoices(subscriptionId: number) {
  return db
    .select()
    .from(billing)
    .where(
      and(
        eq(billing.subscriptionId, subscriptionId),
        isNull(billing.deletedAt)
      )
    );
}