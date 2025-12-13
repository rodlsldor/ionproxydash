// app/api/dashboard/overview/route.ts
import { NextResponse } from 'next/server';
import {
  getTotalPaidThisMonth,
  getUserActiveProxies,
  getUserSubscriptions,
  getUserUsageSeries,
} from '@/lib/db/queries';
import { withAuthRoute } from '@/lib/auth/withAuthRoute';

export const GET = withAuthRoute(async (_req, { auth }) => {
  const { user } = auth;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 90);

  const [invoices, subs, activeAllocations, bandwidthSeries] = await Promise.all([
    getTotalPaidThisMonth(user.id),
    getUserSubscriptions(user.id),
    getUserActiveProxies(user.id),
    getUserUsageSeries({
      userId: user.id,
      range: { from, to: now },
      granularity: 'day',
    }),
  ]);

  const sub = subs[0] ?? null;

  return NextResponse.json({
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
          raw instanceof Date ? raw.toISOString() : new Date(raw as any).toISOString();

        return {
          bucket: bucketIso,
          bytesIn: p.bytesIn,
          bytesOut: p.bytesOut,
          bytesTotal: p.bytesTotal,
        };
      }),
    },
  });
});
