// app/api/dashboard/proxies/route.ts
import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { apiSuccess } from '@/lib/api/response';

import {
  getTotalPaidThisMonth,
  getUserActiveProxies,
  getUserSubscriptions,
  getUserUsageSeries,
  getUserAllocatedProxies,
} from '@/lib/db/queries';

import { getProxyUsageSeries } from '@/lib/db/queries/proxyUsage';

type BandwidthPoint = {
  bucket: string; // ISO
  bytesIn: number;
  bytesOut: number;
  bytesTotal: number;
};

export const GET = withAuthRoute(async (_req, { auth }) => {
  const userId = auth.user.id;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 90);

  const [invoices, subs, activeAllocations, bandwidthSeries, proxiesRows] =
    await Promise.all([
      getTotalPaidThisMonth(userId),
      getUserSubscriptions(userId),
      getUserActiveProxies(userId),
      getUserUsageSeries({
        userId,
        range: { from, to: now },
        granularity: 'day',
      }),
      getUserAllocatedProxies(userId),
    ]);

  const sub = subs[0] ?? null;

  const proxyIds = proxiesRows.map((r) => Number(r.proxyId));
  const bandwidthByProxy: Record<number, BandwidthPoint[]> = {};
  for (const id of proxyIds) bandwidthByProxy[id] = [];

  if (proxyIds.length > 0) {
    const seriesByProxy = await Promise.all(
      proxyIds.map(async (proxyId) => {
        const points = await getProxyUsageSeries({
          proxyId,
          userId,
          range: { from, to: now },
          granularity: 'day',
        });

        const mapped: BandwidthPoint[] = points
          .map((p) => {
            const d = p.bucket instanceof Date ? p.bucket : new Date(p.bucket as any);
            if (Number.isNaN(d.getTime())) return null;

            return {
              bucket: d.toISOString(),
              bytesIn: Number(p.bytesIn) || 0,
              bytesOut: Number(p.bytesOut) || 0,
              bytesTotal: Number(p.bytesTotal) || 0,
            };
          })
          .filter((x): x is BandwidthPoint => Boolean(x));

        return { proxyId, mapped };
      })
    );

    for (const { proxyId, mapped } of seriesByProxy) {
      bandwidthByProxy[proxyId] = mapped;
    }
  }

  return apiSuccess(
    {
      // ==== overview payload ====
      invoices,
      currency: 'USD',
      activeSubscription: sub
        ? {
            nbSubs: subs.length,
            nextInvoiceAt: sub.currentPeriodEnd,
          }
        : null,
      proxiesInUse: {
        active: activeAllocations.length,
        total: null,
      },
      bandwidth: {
        points: bandwidthSeries.map((p) => {
          const raw = p.bucket as unknown;
          const bucketIso =
            raw instanceof Date
              ? raw.toISOString()
              : new Date(raw as any).toISOString();

          return {
            bucket: bucketIso,
            bytesIn: p.bytesIn,
            bytesOut: p.bytesOut,
            bytesTotal: p.bytesTotal,
          };
        }),
      },

      // ==== proxies payload (ex-route /proxies) ====
      proxies: proxiesRows,
      bandwidthByProxy,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
