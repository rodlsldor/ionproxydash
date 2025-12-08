// app/api/dashboard/proxies/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import {
  proxyAllocations,
  proxies,
  proxyUsageSamples,
} from '@/lib/db/schema';
import { and, eq, isNull, gte, lte, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    .where(
      and(
        eq(proxyAllocations.userId, user.id),
        isNull(proxies.deletedAt)
      )
    );

  // 2) Bandwidth par proxy (derniers 90 jours, agrégé par jour)
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 90);

  type BandwidthPoint = {
    bucket: string;
    bytesIn: number;
    bytesOut: number;
    bytesTotal: number;
  };

  const bandwidthByProxy: Record<number, BandwidthPoint[]> = {};

  for (const row of rows) {
    const proxyId = row.proxyId;

    const bucket = sql<Date>`date_trunc('day', ${proxyUsageSamples.ts})`.as(
      'bucket'
    );

    const usage = await db
      .select({
        bucket,
        bytesIn: sql<number>`sum(${proxyUsageSamples.bytesIn})`,
        bytesOut: sql<number>`sum(${proxyUsageSamples.bytesOut})`,
        bytesTotal: sql<number>`sum(${proxyUsageSamples.bytesIn} + ${proxyUsageSamples.bytesOut})`,
      })
      .from(proxyUsageSamples)
      .where(
        and(
          eq(proxyUsageSamples.proxyId, proxyId),
          eq(proxyUsageSamples.userId, user.id),
          gte(proxyUsageSamples.ts, from),
          lte(proxyUsageSamples.ts, now)
        )
      )
      .groupBy(bucket)
      .orderBy(bucket);

    bandwidthByProxy[proxyId] = usage.map((u) => ({
      bucket:
        u.bucket instanceof Date
          ? u.bucket.toISOString()
          : String(u.bucket),
      bytesIn: Number(u.bytesIn) || 0,
      bytesOut: Number(u.bytesOut) || 0,
      bytesTotal: Number(u.bytesTotal) || 0,
    }));
  }

  return NextResponse.json({
    proxies: rows,
    bandwidthByProxy,
  });
}
