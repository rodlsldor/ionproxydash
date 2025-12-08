/* =======================
 * IMPORTS
 * ======================= */

import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { User, users, subscriptions, type Subscription as DbSubscription } from '@/lib/db/schema';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

/* =======================
 * STRIPE FUNCTIONS
 * ======================= */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

// Assure qu'un user a bien un customer Stripe, sinon on le crée et on le stocke en DB
async function ensureStripeCustomerForUser(user: User): Promise<string> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, user.id));

  return customer.id;
}

/**
 * Crée une Checkout Session Stripe pour un abonnement basé sur un priceId.
 * (équivalent de ton ancienne logique "Team", mais maintenant au niveau User.)
 */
export async function createCheckoutSession({ priceId }: { priceId: string }) {
  const user = await getUser();

  if (!user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  const customerId = await ensureStripeCustomerForUser(user!);

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: customerId,
    client_reference_id: user!.id.toString(),
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14,
    },
  });

  if (!session.url) {
    throw new Error('Stripe Checkout session has no URL');
  }
  redirect(session.url);
}

/**
 * Crée une session de portail client Stripe pour que l'utilisateur gère son abonnement.
 */
export async function createCustomerPortalSession() {
  const user = await getUser();

  if (!user || !user.stripeCustomerId) {
    redirect('/pricing');
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user!.stripeCustomerId as string,
    return_url: `${process.env.BASE_URL}/dashboard`,
  });

  return portalSession;
}

/**
 * (Stub pour plus tard) Gestion des changements d'abonnement Stripe via webhook.
 * On le laissera en TODO tant qu'on n'a pas branché ta table `subscriptions`.
 */
export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const sub = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const stripeId = subscription.id;
  const stripeStatus = subscription.status;
  const now = new Date();

  // 1. Mapper le statut Stripe -> ton enum interne
  let newStatus: DbSubscription['status'];

  switch (stripeStatus) {
    case 'trialing':
    case 'active':
      newStatus = 'active';
      break;
    case 'past_due':
    case 'unpaid':
      newStatus = 'past_due';
      break;
    case 'canceled':
      newStatus = 'canceled';
      break;
    default:
      newStatus = 'paused';
  }

  // 2. Convertir les timestamps Stripe (seconds) en Date JS
  const currentPeriodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : null;

  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null;

  // 3. Construire le patch
  const updatePatch: Partial<DbSubscription> = {
    status: newStatus,
    currentPeriodStart,
    currentPeriodEnd,
    updatedAt: now,
  };

  if (newStatus === 'canceled') {
    updatePatch.canceledAt = now;
  }

  // 4. Update en BDD
  const [updated] = await db
    .update(subscriptions)
    .set(updatePatch)
    .where(eq(subscriptions.stripeSubscriptionId, stripeId))
    .returning();

  if (!updated) {
    console.error(
      '[Stripe] Subscription not found in DB for stripeSubscriptionId =',
      stripeId
    );
    return;
  }

  console.log(
    '[Stripe] Subscription synced:',
    stripeId,
    '->',
    newStatus
  );
  // 5. (Optionnel plus tard) :
  //    si newStatus === 'canceled' ou 'past_due',
  //    tu peux ici appeler une fonction du style :
  //    await disableAllocationsForSubscription(updated.id);
}

/**
 * Récupère les prix Stripe (tu peux garder ça pour ta page de pricing).
 */
export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring',
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days,
  }));
}

/**
 * Récupère les produits Stripe (pour construire ton pricing).
 */
export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id,
  }));
}