// app/api/dashboard/overview/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/next-auth'; // ton fichier auth.ts / next-auth.ts
import {
  getTotalPaidThisMonth,
  getUserByEmail,
  getUserActiveProxies,
  getUserSubscriptions,
  getUserUsageSeries,
} from '@/lib/db/queries';

export async function GET() {
  // 1) Session Auth.js v5
  const session = await auth();
  console.log('SESSION IN OVERVIEW =', session);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Récup user DB via l’email
  const email = session.user.email;
  const user = await getUserByEmail(email);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 90); // 90 jours pour le graph

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
