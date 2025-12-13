// app/api/dashboard/proxies/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { proxyAllocations, proxies, proxyUsageSamples } from '@/lib/db/schema';
import { and, eq, isNull, gte, lte, sql } from 'drizzle-orm';
import { withAuthRoute } from '@/lib/auth/withAuthRoute';

type BandwidthPoint = {
  bucket: string; // ISO
  bytesIn: number;
  bytesOut: number;
  bytesTotal: number;
};

export const GET = withAuthRoute(async (_req, { auth }) => {
  const userId = auth.user.id;

  // 1) Proxies alloués à l'utilisateur
  const rows = await db
    .select({
      allocationId: proxyAllocations.id,
      proxyId: proxies.id,
      label: proxies.label,
      ipAddress: proxies.ipAddress,
      port: proxies.port,
      location: proxies.location,
      isp: proxies.isp,
      status: proxies.status,
      dongleId: proxies.dongleId,
      lastHealthCheck: proxies.lastHealthCheck,
      startsAt: proxyAllocations.startsAt,
      endsAt: proxyAllocations.endsAt,
    })
    .from(proxyAllocations)
    .innerJoin(proxies, eq(proxyAllocations.proxyId, proxies.id))
    .where(and(eq(proxyAllocations.userId, userId), isNull(proxies.deletedAt)));

  const proxyIds = rows.map((r) => r.proxyId);

  // 2) Bandwidth par proxy (90 jours, agrégé par jour) — 1 seule requête
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 90);

  const bandwidthByProxy: Record<number, BandwidthPoint[]> = {};

  // initialise pour que les proxies sans usage aient []
  for (const id of proxyIds) bandwidthByProxy[id] = [];

  if (proxyIds.length > 0) {
    const bucketExpr = sql<Date>`date_trunc('day', ${proxyUsageSamples.ts})`.as('bucket');

    const usage = await db
      .select({
        proxyId: proxyUsageSamples.proxyId,
        bucket: bucketExpr,
        bytesIn: sql<number>`sum(${proxyUsageSamples.bytesIn})`,
        bytesOut: sql<number>`sum(${proxyUsageSamples.bytesOut})`,
        bytesTotal: sql<number>`sum(${proxyUsageSamples.bytesIn} + ${proxyUsageSamples.bytesOut})`,
      })
      .from(proxyUsageSamples)
      .where(
        and(
          eq(proxyUsageSamples.userId, userId),
          gte(proxyUsageSamples.ts, from),
          lte(proxyUsageSamples.ts, now),
          sql`${proxyUsageSamples.proxyId} in (${sql.join(
            proxyIds.map((id) => sql`${id}`),
            sql`,`
          )})`
        )
      )
      .groupBy(proxyUsageSamples.proxyId, bucketExpr)
      .orderBy(proxyUsageSamples.proxyId, bucketExpr);

    for (const u of usage) {
      const d = u.bucket instanceof Date ? u.bucket : new Date(u.bucket as any);
      const bucketIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
      if (!bucketIso) continue;

      const pid = Number(u.proxyId);
      (bandwidthByProxy[pid] ??= []).push({
        bucket: bucketIso,
        bytesIn: Number(u.bytesIn) || 0,
        bytesOut: Number(u.bytesOut) || 0,
        bytesTotal: Number(u.bytesTotal) || 0,
      });
    }
  }

  return NextResponse.json(
    { proxies: rows, bandwidthByProxy },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
