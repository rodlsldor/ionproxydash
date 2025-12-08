// lib/db/queries/proxyUsage.ts
import { db } from '@/lib/db/drizzle';
import {
  proxyUsageSamples,
} from '@/lib/db/schema';
import {
  and,
  eq,
  gte,
  lte,
  lt,
  desc,
  sql,
} from 'drizzle-orm';

// Types générés par Drizzle
export type ProxyUsageSample = typeof proxyUsageSamples.$inferSelect;
export type NewProxyUsageSample = typeof proxyUsageSamples.$inferInsert;

export type UsageGranularity = 'minute' | 'hour' | 'day';

export interface TimeRange {
  from: Date;
  to: Date;
}

/* =========================================================
 * 1) INSERTS
 * ======================================================= */

/**
 * Enregistrer un point de mesure pour un proxy.
 * - ts est optionnel → defaultNow() côté DB si non fourni
 */
export async function recordProxyUsage(input: {
  proxyId: number;
  userId: number;
  allocationId?: number | null;
  bytesIn: number;
  bytesOut: number;
  ts?: Date;
}): Promise<ProxyUsageSample> {
  const [row] = await db
    .insert(proxyUsageSamples)
    .values({
      proxyId: input.proxyId,
      userId: input.userId,
      allocationId: input.allocationId ?? null,
      bytesIn: input.bytesIn,
      bytesOut: input.bytesOut,
      ts: input.ts, // peut être undefined → géré par defaultNow()
    })
    .returning();

  return row;
}

/**
 * Bulk insert (par ex. si tu push des stats toutes les X secondes
 * depuis xProxy en batch).
 */
export async function recordProxyUsageBatch(
  items: Array<{
    proxyId: number;
    userId: number;
    allocationId?: number | null;
    bytesIn: number;
    bytesOut: number;
    ts?: Date;
  }>
): Promise<void> {
  if (items.length === 0) return;

  await db.insert(proxyUsageSamples).values(
    items.map((i) => ({
      proxyId: i.proxyId,
      userId: i.userId,
      allocationId: i.allocationId ?? null,
      bytesIn: i.bytesIn,
      bytesOut: i.bytesOut,
      ts: i.ts,
    }))
  );
}

/* =========================================================
 * 2) SÉRIES TEMPORELLES (pour Area Chart)
 * ======================================================= */

type UsagePoint = {
  bucket: Date;
  bytesIn: number;
  bytesOut: number;
  bytesTotal: number;
};

/**
 * Série d’utilisation pour un USER (tous ses proxys).
 * Granularité : minute / hour / day
 */
export async function getUserUsageSeries(params: {
  userId: number;
  range: TimeRange;
  granularity: UsageGranularity;
}): Promise<UsagePoint[]> {
  const { userId, range, granularity } = params;

  const bucket = sql<Date>`date_trunc(${granularity}, ${proxyUsageSamples.ts})`.as(
    'bucket'
  );

  const rows = await db
    .select({
      bucket,
      bytesIn: sql<number>`sum(${proxyUsageSamples.bytesIn})`,
      bytesOut: sql<number>`sum(${proxyUsageSamples.bytesOut})`,
      bytesTotal: sql<number>`sum(${proxyUsageSamples.bytesIn} + ${proxyUsageSamples.bytesOut})`,
    })
    .from(proxyUsageSamples)
    .where(
      and(
        eq(proxyUsageSamples.userId, userId),
        gte(proxyUsageSamples.ts, range.from),
        lte(proxyUsageSamples.ts, range.to)
      )
    )
    .groupBy(bucket)
    .orderBy(bucket);

  return rows;
}

/**
 * Série d’utilisation pour un PROXY précis (tous users confondus, ou filtré par user).
 */
export async function getProxyUsageSeries(params: {
  proxyId: number;
  range: TimeRange;
  granularity: UsageGranularity;
  userId?: number;
}): Promise<UsagePoint[]> {
  const { proxyId, range, granularity, userId } = params;


  const allowed = ['minute', 'hour', 'day'] as const;


  if (!allowed.includes(granularity)) {
    throw new Error(`Invalid granularity: ${granularity}`);
  }


  const bucket = sql<Date>`date_trunc(${granularity}, ${proxyUsageSamples.ts})`.as(
    'bucket'
  );

  const conditions = [
    eq(proxyUsageSamples.proxyId, proxyId),
    gte(proxyUsageSamples.ts, range.from),
    lte(proxyUsageSamples.ts, range.to),
  ];

  if (userId) {
    conditions.push(eq(proxyUsageSamples.userId, userId));
  }

  const rows = await db
    .select({
      bucket,
      bytesIn: sql<number>`sum(${proxyUsageSamples.bytesIn})`,
      bytesOut: sql<number>`sum(${proxyUsageSamples.bytesOut})`,
      bytesTotal: sql<number>`sum(${proxyUsageSamples.bytesIn} + ${proxyUsageSamples.bytesOut})`,
    })
    .from(proxyUsageSamples)
    .where(and(...conditions))
    .groupBy(bucket)
    .orderBy(sql`bucket`);

  return rows;
}

/**
 * Série d’utilisation pour une ALLOCATION (utile si tu veux afficher
 * l’historique d’un proxy loué sur la durée d’un abonnement).
 */
export async function getAllocationUsageSeries(params: {
  allocationId: number;
  range?: TimeRange; // optionnel, par défaut toute la durée existante
  granularity: UsageGranularity;
}): Promise<UsagePoint[]> {
  const { allocationId, range, granularity } = params;

  const bucket = sql<Date>`date_trunc(${granularity}, ${proxyUsageSamples.ts})`.as(
    'bucket'
  );

  const conditions = [eq(proxyUsageSamples.allocationId, allocationId)];

  if (range) {
    conditions.push(
      gte(proxyUsageSamples.ts, range.from),
      lte(proxyUsageSamples.ts, range.to)
    );
  }

  const rows = await db
    .select({
      bucket,
      bytesIn: sql<number>`sum(${proxyUsageSamples.bytesIn})`,
      bytesOut: sql<number>`sum(${proxyUsageSamples.bytesOut})`,
      bytesTotal: sql<number>`sum(${proxyUsageSamples.bytesIn} + ${proxyUsageSamples.bytesOut})`,
    })
    .from(proxyUsageSamples)
    .where(and(...conditions))
    .groupBy(bucket)
    .orderBy(bucket);

  return rows;
}

/* =========================================================
 * 3) RÉSUMÉS / AGGRÉGATS
 * ======================================================= */

export type UsageSummary = {
  bytesIn: number;
  bytesOut: number;
  bytesTotal: number;
};

/**
 * Total de bande passante d’un user sur une période.
 */
export async function getUserUsageSummary(params: {
  userId: number;
  range: TimeRange;
}): Promise<UsageSummary> {
  const { userId, range } = params;

  const [row] = await db
    .select({
      bytesIn: sql<number>`coalesce(sum(${proxyUsageSamples.bytesIn}), 0)`,
      bytesOut: sql<number>`coalesce(sum(${proxyUsageSamples.bytesOut}), 0)`,
      bytesTotal: sql<number>`coalesce(sum(${proxyUsageSamples.bytesIn} + ${proxyUsageSamples.bytesOut}), 0)`,
    })
    .from(proxyUsageSamples)
    .where(
      and(
        eq(proxyUsageSamples.userId, userId),
        gte(proxyUsageSamples.ts, range.from),
        lte(proxyUsageSamples.ts, range.to)
      )
    );

  return row;
}

/**
 * Top N proxys qui consomment le plus pour un user donné sur une période.
 * Utile pour une "Top Proxies by bandwidth" sur le dashboard.
 */
export async function getTopProxiesByUsage(params: {
  userId: number;
  range: TimeRange;
  limit?: number;
}): Promise<
  {
    proxyId: number;
    bytesTotal: number;
  }[]
> {
  const { userId, range, limit = 10 } = params;

  const rows = await db
    .select({
      proxyId: proxyUsageSamples.proxyId,
      bytesTotal: sql<number>`sum(${proxyUsageSamples.bytesIn} + ${proxyUsageSamples.bytesOut})`,
    })
    .from(proxyUsageSamples)
    .where(
      and(
        eq(proxyUsageSamples.userId, userId),
        gte(proxyUsageSamples.ts, range.from),
        lte(proxyUsageSamples.ts, range.to)
      )
    )
    .groupBy(proxyUsageSamples.proxyId)
    .orderBy(desc(sql`sum(${proxyUsageSamples.bytesIn} + ${proxyUsageSamples.bytesOut})`))
    .limit(limit);

  return rows;
}

/* =========================================================
 * 4) MAINTENANCE / RÉTENTION
 * ======================================================= */

/**
 * Supprime les données plus vieilles que une certaine date.
 * → à appeler depuis un cron quotidien pour ta rétention 3 mois.
 */
export async function deleteUsageOlderThan(cutoff: Date): Promise<number> {
  const result = await db
    .delete(proxyUsageSamples)
    .where(lt(proxyUsageSamples.ts, cutoff))
    .returning({ id: proxyUsageSamples.id });

  return result.length; // nb de lignes supprimées
}

/**
 * Helper concret pour ta politique « max 3 mois ».
 */
export async function enforceThreeMonthsRetention(): Promise<number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  return deleteUsageOlderThan(cutoff);
}
