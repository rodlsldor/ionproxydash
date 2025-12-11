// app/api/dashboard/overview/route.ts
import { NextResponse } from 'next/server';
import {
  getTotalPaidThisMonth,
  getUserActiveProxies,
  getUserSubscriptions,
  getUserUsageSeries,
} from '@/lib/db/queries';
import { requireUserApi } from '@/lib/auth/user';

export async function GET() {
  // 1) User courant via Auth.js + DB
  const user = await requireUserApi();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 90); // 90 jours pour le graph

  // 2) Récup des données liées au user
  const [invoices, subs, activeAllocations, bandwidthSeries] = await Promise.all([
    getTotalPaidThisMonth(user.id),
    getUserSubscriptions(user.id),
    getUserActiveProxies(user.id),
    getUserUsageSeries({
      userId: user.id,
      range: { from, to: now },
      granularity: 'day', // ou 'hour' si tu veux plus fin
    }),
  ]);

  const sub = subs[0] ?? null;

  // 3) Réponse JSON pour le dashboard
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
        const raw = p.bucket as any;

        const bucketIso =
          raw instanceof Date
            ? raw.toISOString()
            : new Date(raw).toISOString();

        return {
          bucket: bucketIso,
          bytesIn: p.bytesIn,
          bytesOut: p.bytesOut,
          bytesTotal: p.bytesTotal,
        };
      }),
    },
  });
}
