// app/api/dashboard/proxies/route.ts
import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { apiSuccess } from '@/lib/api/response';

import { getUserAllocatedProxies } from '@/lib/db/queries';
import { getProxyUsageSeries } from '@/lib/db/queries/proxyUsage';

type BandwidthPoint = {
  bucket: string; // ISO
  bytesIn: number;
  bytesOut: number;
  bytesTotal: number;
};

export const GET = withAuthRoute(async (_req, { auth }) => {
  const userId = auth.user.id;

  // 1) Proxies alloués à l'utilisateur (via query existante)
  const proxiesRows = await getUserAllocatedProxies(userId);

  const proxyIds = proxiesRows.map((r) => Number(r.proxyId));

  // 2) Bandwidth par proxy (90 jours, agrégé par jour) — via query existante
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 90);

  const bandwidthByProxy: Record<number, BandwidthPoint[]> = {};
  for (const id of proxyIds) bandwidthByProxy[id] = [];

  if (proxyIds.length > 0) {
    const seriesByProxy = await Promise.all(
      proxyIds.map(async (proxyId) => {
        const points = await getProxyUsageSeries({
          proxyId,
          userId, // filtre par user (important)
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
      proxies: proxiesRows,
      bandwidthByProxy,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
