/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  isNull,
  isNotNull,
  inArray,
  lt,
} from 'drizzle-orm';

/* ======================
 * DATABASE INSTANCE
 * ====================== */

import { db } from '../drizzle';

/* ======================
 * TABLES / SCHEMA
 * ====================== */

import {
  users,
  proxies,
  billing,
} from '../schema';

import { expireAllocations } from './allocations';
/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

// CRON / MAINTENANCE TASKS

type ProxyHealthStatus = 'healthy' | 'unreachable' | 'slow' | 'auth_failed' | 'unknown';

// temporaire
async function checkSingleProxyHealth(ip: string, port: number): Promise<ProxyHealthStatus> {
  // TODO: appeler ton infra xProxy / faire un ping / check HTTP
  // pour l'instant, on simule "healthy"
  return 'healthy';
}

type XProxyStatus = {
  ipAddress: string;
  port: number;
  status: 'up' | 'down' | 'banned' | 'cooldown';
  dongleId?: string | number | null;
};

async function fetchXProxyStatuses(): Promise<XProxyStatus[]> {
  // TODO: call HTTP vers ton infra xProxy
  // ex: const res = await fetch('http://xproxy/api/status');
  // return res.json();
  return [];
}

/* ======================
 * MAINTENANCE/CRON
 * ====================== */

export async function cleanupSoftDeletedUsers(retentionDays: number): Promise<number> {
  // Nettoyage périodique
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const deleted = await db
    .delete(users)
    .where(
      and(
        isNotNull(users.deletedAt),
        lt(users.deletedAt, cutoff)
      )
    )
    .returning({ id: users.id });

  return deleted.length;
}

export async function cleanupExpiredAllocations() {
  // Expire les proxies terminés
  const count = await expireAllocations();
  return count;
}

export async function cleanupOldInvoices(retentionDays: number): Promise<number> {
  // Supprime factures archivées
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const archived = await db
    .update(billing)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        isNull(billing.deletedAt),
        lt(billing.createdAt, cutoff),
        inArray(billing.status, ['paid', 'cancelled'] as const)
      )
    )
    .returning({ id: billing.id });

  return archived.length;
}

export async function performHealthCheck() {
  // Vérifie l’état des proxies

  const rows = await db
    .select({
      id: proxies.id,
      ipAddress: proxies.ipAddress,
      port: proxies.port,
    })
    .from(proxies)
    .where(isNull(proxies.deletedAt));

  if (rows.length === 0) return 0;

  const now = new Date();

  // On boucle, mais tu pourras paralléliser avec Promise.all si besoin
  let updatedCount = 0;

  for (const proxy of rows) {
    const health = await checkSingleProxyHealth(proxy.ipAddress, proxy.port);

    await db
      .update(proxies)
      .set({
        // @ts-ignore si tu n'as pas encore ces champs :
        healthStatus: health,
        // @ts-ignore
        lastHealthCheckAt: now,
      })
      .where(eq(proxies.id, proxy.id));

    updatedCount++;
  }

  return updatedCount;
}

export async function refreshProxiesStatus() {
  // Synchronise avec ton infra xProxy

  const externalStatuses = await fetchXProxyStatuses();

  if (externalStatuses.length === 0) {
    return 0;
  }

  let updatedCount = 0;

  for (const ext of externalStatuses) {
    // On cherche le proxy correspondant en BDD
    const [proxy] = await db
      .select({ id: proxies.id })
      .from(proxies)
      .where(
        and(
          eq(proxies.ipAddress, ext.ipAddress),
          eq(proxies.port, ext.port)
        )
      )
      .limit(1);

    if (!proxy) continue;

    // Mapping simple du status externe vers ton status interne
    let internalStatus: 'available' | 'allocated' | 'disabled' = 'available';

    switch (ext.status) {
      case 'up':
        internalStatus = 'available';
        break;
      case 'down':
      case 'banned':
      case 'cooldown':
        internalStatus = 'disabled';
        break;
      default:
        internalStatus = 'disabled';
    }

    await db
      .update(proxies)
      .set({
        status: internalStatus,
        // @ts-ignore si tu as un champ dongleId
        dongleId: ext.dongleId ?? null,
      })
      .where(eq(proxies.id, proxy.id));

    updatedCount++;
  }

  return updatedCount;
}
