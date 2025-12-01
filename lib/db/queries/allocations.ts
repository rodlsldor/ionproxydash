/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  inArray,
  desc,
  lt,
  gt,
} from 'drizzle-orm';

/* ======================
 * DATABASE INSTANCE
 * ====================== */

import { db } from '../drizzle';

/* ======================
 * TABLES / SCHEMA
 * ====================== */

import {
  proxies,
  proxyAllocations,
} from '../schema';

/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

import type {
  ProxyAllocation,
  NewProxyAllocation,
} from '../schema';

/* ======================
 * PROXY ALLOCATIONS
 * ====================== */

export async function allocateProxyToUser(input: {
  userId: number;
  proxyId: number;
  priceMonthly: number;
}) {
  const { userId, proxyId, priceMonthly } = input;

  if (priceMonthly <= 0) {
    throw new Error('priceMonthly must be positive');
  }

  const available = await isProxyAvailable(proxyId);
  if (!available) {
    throw new Error('Proxy is not available');
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + 30);

  const [allocation] = await db
    .insert(proxyAllocations)
    .values({
      userId,
      proxyId,
      startsAt,
      endsAt,
      status: 'active',
      priceMonthly,
      subscriptionId: null,
    } satisfies Omit<NewProxyAllocation, 'id' | 'createdAt'>)
    .returning();

  await db
    .update(proxies)
    .set({ status: 'allocated' })
    .where(eq(proxies.id, proxyId));

  return allocation;
}

export async function releaseProxy(allocationId: number): Promise<ProxyAllocation | null> {
  // Libère un proxy

  const now = new Date();

  // On ne libère que les allocations encore actives
  const [allocation] = await db
    .update(proxyAllocations)
    .set({
      status: 'cancelled', 
      endsAt: now,
    })
    .where(
      and(
        eq(proxyAllocations.id, allocationId),
        eq(proxyAllocations.status, 'active')
      )
    )
    .returning();

  if (!allocation) {
    return null;
  }

  await db
    .update(proxies)
    .set({ status: 'available' })
    .where(eq(proxies.id, allocation.proxyId));

  return allocation;
}

export async function renewProxy(allocationId: number) {
  // Renouvelle une allocation (nouvelle date de fin)
  const now = new Date();
  const newEndsAt = new Date(now);
  newEndsAt.setDate(newEndsAt.getDate() + 30);

  const [allocation] = await db
    .update(proxyAllocations)
    .set({
      status: 'active',
      endsAt: newEndsAt,
    })
    .where(eq(proxyAllocations.id, allocationId))
    .returning();

  return allocation ?? null;
}

export async function getUserActiveProxies(userId: number) {
  // Liste les proxies actifs du user
  const now = new Date();

  const rows = await db
    .select({
      allocationId: proxyAllocations.id,
      proxy: proxies,
    })
    .from(proxyAllocations)
    .innerJoin(proxies, eq(proxyAllocations.proxyId, proxies.id))
    .where(
      and(
        eq(proxyAllocations.userId, userId),
        eq(proxyAllocations.status, 'active'),
        gt(proxyAllocations.endsAt, now)
      )
    )
    .orderBy(desc(proxyAllocations.startsAt));

  return rows.map((row) => ({
    ...row.proxy,
    allocationId: row.allocationId,
  }));
}

export async function getProxyAllocationHistory(proxyId: number):Promise<ProxyAllocation[]> {
  // Historique des locations d’un proxy

  return await db
    .select()
    .from(proxyAllocations)
    .where(eq(proxyAllocations.proxyId, proxyId))
    .orderBy(desc(proxyAllocations.startsAt));
}

export async function getUserAllocationHistory(userId: number):Promise<ProxyAllocation[]> {
  // Historique des proxies loués par un user
  return await db
    .select()
    .from(proxyAllocations)
    .where(eq(proxyAllocations.userId, userId))
    .orderBy(desc(proxyAllocations.startsAt));
}

export async function cancelAllocation(allocationId: number): Promise<ProxyAllocation | null> {
  // Annule une allocation avant expiration
  const now = new Date();

  // 1. On annule l’allocation
  const [allocation] = await db
    .update(proxyAllocations)
    .set({
      status: 'cancelled',
      endsAt: now,
    })
    .where(eq(proxyAllocations.id, allocationId))
    .returning();

  if (!allocation) {
    return null;
  }

  // 2. Libération du proxy
  await db
    .update(proxies)
    .set({ status: 'available' })
    .where(eq(proxies.id, allocation.proxyId));

  return allocation;
}

export async function expireAllocations(): Promise<number> {
  // Termine automatiquement les allocations expirées (cron)
  const now = new Date();

  // 1. allocations expirées
  const expired = await db
    .select({
      id: proxyAllocations.id,
      proxyId: proxyAllocations.proxyId,
    })
    .from(proxyAllocations)
    .where(
      and(
        eq(proxyAllocations.status, 'active'),
        lt(proxyAllocations.endsAt, now)
      )
    );

  if (expired.length === 0) return 0;

  const allocationIds = expired.map(a => a.id);
  const proxyIds = expired.map(a => a.proxyId);

  // 2. Marquer expired
  await db
    .update(proxyAllocations)
    .set({ status: 'expired' })
    .where(inArray(proxyAllocations.id, allocationIds));

  // 3. Libérer les proxies
  await db
    .update(proxies)
    .set({ status: 'available' })
    .where(inArray(proxies.id, proxyIds));

  return allocationIds.length;
}

export async function isProxyAvailable(proxyId: number): Promise<boolean> {
  // Vérifie si un proxy est libre
  const now = new Date();

  // Aucun contrat actif qui n'a pas expiré
  const activeAlloc = await db
    .select({ id: proxyAllocations.id })
    .from(proxyAllocations)
    .where(
      and(
        eq(proxyAllocations.proxyId, proxyId),
        eq(proxyAllocations.status, 'active'),
        gt(proxyAllocations.endsAt, now)
      )
    )
    .limit(1);

  return activeAlloc.length === 0;
}