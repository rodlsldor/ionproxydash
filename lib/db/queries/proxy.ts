/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  isNull,
  ne,
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
  Proxy,
  NewProxy,
} from '../schema';

//PROXY UPDATE INPUT TYPE

type UpdateProxyInput = Partial<
  Omit<NewProxy, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
>;

/* ======================
 * PROXIES
 * ====================== */

export async function createProxy(input: {
  label?: string | null;
  ipAddress: string;
  port: number;
  username?: string | null;
  password?: string | null;
  location?: string | null;
  isp?: string | null;
  dongleId?: string | null;
}): Promise<Proxy> {
  // Ajoute un proxy dans la base

  // 1. Vérifie si un proxy actif existe déjà avec ce couple IP + port
  const existing = await db
    .select()
    .from(proxies)
    .where(
      and(
        eq(proxies.ipAddress, input.ipAddress),
        eq(proxies.port, input.port),
        isNull(proxies.deletedAt)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('A proxy with this IP and port already exists');
  }

  // 2. Création
  const [proxy] = await db
    .insert(proxies)
    .values({
      label: input.label ?? null,
      ipAddress: input.ipAddress,
      port: input.port,
      username: input.username ?? null,
      password: input.password ?? null,
      location: input.location ?? null,
      isp: input.isp ?? null,
      dongleId: input.dongleId ?? null,
      // status: 'available' par défaut via la DB
    })
    .returning();

  return proxy;
}

export async function updateProxy(proxyId: number, data: {
  label?: string | null;
  ipAddress?: string;
  port?: number;
  username?: string | null;
  password?: string | null;
  location?: string | null;
  isp?: string | null;
  status?: 'available' | 'allocated' | 'disabled';
  dongleId?: number | null;
}): Promise<Proxy | null> {
  // Met à jour un proxy (label, IP, status, etc.)

 // 0. Si aucun champ à mettre à jour → on retourne juste le proxy
  if (!data || Object.keys(data).length === 0) {
    return await getProxyById(proxyId);
  }

  // 1. Si IP ou port changent → vérifie qu’il n’y ait pas de doublon
  if (data.ipAddress !== undefined || data.port !== undefined) {
    const proxy = await getProxyById(proxyId);
    if (!proxy) {
      throw new Error('Proxy not found');
    }

    const newIp = data.ipAddress ?? proxy.ipAddress;
    const newPort = data.port ?? proxy.port;

    const duplicate = await db
      .select({ id: proxies.id })
      .from(proxies)
      .where(
        and(
          eq(proxies.ipAddress, newIp),
          eq(proxies.port, newPort),
          isNull(proxies.deletedAt),
          ne(proxies.id, proxyId) // ne pas se comparer à soi-même
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      throw new Error('Another proxy already uses this IP and port');
    }
  }

  // 2. Mise à jour du proxy
  const [updated] = await db
    .update(proxies)
    .set({
      ...data,
      updatedAt: new Date(),
    } as UpdateProxyInput & { updatedAt: Date }) // on aide TS un peu
    .where(and(eq(proxies.id, proxyId), isNull(proxies.deletedAt)))
    .returning();

  return updated ?? null;
}

export async function deleteProxy(proxyId: number): Promise<Proxy | null> {
  // Supprime ou soft delete un proxy
  const [deleted] = await db
    .update(proxies)
    .set({
      deletedAt: new Date(),
      status: 'disabled',
      updatedAt: new Date(),
    })
    .where(and(eq(proxies.id, proxyId), isNull(proxies.deletedAt)))
    .returning();

  return deleted ?? null;
}

export async function getProxyById(proxyId: number): Promise<Proxy | null> {
  // Retourne un proxy précis
  const result = await db
    .select()
    .from(proxies)
    .where(and(eq(proxies.id, proxyId), isNull(proxies.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getProxyByIpAndPort(ipAddress: string, port: number): Promise<Proxy | null> {
  // Recherche un proxy via IP + port
  const result = await db
    .select()
    .from(proxies)
    .where(
      and(
        eq(proxies.ipAddress, ipAddress),
        eq(proxies.port, port),
        isNull(proxies.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAllProxies(options?: { includeDeleted?: boolean }) {
  // Liste tous les proxies
  if (options?.includeDeleted) {
    // Tous les proxies, même supprimés
    return await db.select().from(proxies);
  }

  // Par défaut, uniquement les proxies actifs / non supprimés
  return await db
    .select()
    .from(proxies)
    .where(isNull(proxies.deletedAt));
}

export async function getAvailableProxies() {
  // Liste uniquement les proxies disponibles
  return await db
    .select()
    .from(proxies)
    .where(
      and(
        eq(proxies.status, 'available'),
        isNull(proxies.deletedAt)
      )
    );
}

export async function getAllocatedProxies() {
  // Liste les proxies déjà loués
  return await db
    .select()
    .from(proxies)
    .where(
      and(
        eq(proxies.status, 'allocated'),
        isNull(proxies.deletedAt)
      )
    );
}

export async function disableProxy(proxyId: number): Promise<Proxy | null> {
  // Passe le proxy en disabled
  const [proxy] = await db
    .update(proxies)
    .set({
      status: 'disabled',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(proxies.id, proxyId),
        isNull(proxies.deletedAt)
      )
    )
    .returning();

  return proxy ?? null;
}

export async function enableProxy(proxyId: number): Promise<Proxy | null> {
  // Réactive un proxy
  const [proxy] = await db
    .update(proxies)
    .set({
      status: 'available',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(proxies.id, proxyId),
        isNull(proxies.deletedAt)
      )
    )
    .returning();

  return proxy ?? null;
}

export async function updateProxyHealth(proxyId: number, isHealthy: boolean): Promise<Proxy | null> {
  // Update last_health_check
  const [proxy] = await db
    .update(proxies)
    .set({
      lastHealthCheck: new Date(),
      // optionnel : ajuste le status selon la santé
      status: isHealthy ? 'available' : 'disabled',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(proxies.id, proxyId),
        isNull(proxies.deletedAt)
      )
    )
    .returning();

  return proxy ?? null;
}

export async function attachDongleToProxy(dongleId: string, proxyId: number): Promise<Proxy | null> {
  // Associe un dongle à un proxy
  const [proxy] = await db
    .update(proxies)
    .set({
      dongleId: dongleId as any, // adapte au type réel de ton schema (string ou number)
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(proxies.id, proxyId),
        isNull(proxies.deletedAt)
      )
    )
    .returning();

  return proxy ?? null;
}

export async function detachDongle(proxyId: number): Promise<Proxy | null> {
  // Supprime l'association dongle → proxy
  const [proxy] = await db
    .update(proxies)
    .set({
      dongleId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(proxies.id, proxyId),
        isNull(proxies.deletedAt)
      )
    )
    .returning();

  return proxy ?? null;
}

export async function getUserAllocatedProxies(userId: number) {
  // Proxies alloués au user, avec infos allocation
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
        eq(proxyAllocations.userId, userId),
        eq(proxyAllocations.status, 'active'),
        isNull(proxies.deletedAt)
      )
    )
    .orderBy(proxyAllocations.startsAt);

  return rows;
}
