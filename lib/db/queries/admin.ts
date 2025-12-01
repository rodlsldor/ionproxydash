/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  isNull,
  gt,
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
  proxyAllocations,
  funds,
} from '../schema';

import { getTotalRevenue, getAvailableProxiesCount} from './stats';
import { softDeleteUser, restoreUser } from './users';

/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

import type {
  User,
  ProxyAllocation,
  Funds,
} from '../schema';


/* ======================
 * ADMIN/BACKOFFICE
 * ====================== */

export async function getAllUsers(options?: { includeDeleted?: boolean }) {
  // Liste tous les utilisateurs
  if (options?.includeDeleted) {
    return await db.select().from(users);
  }

  return await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt));
}

export async function getAllAllocations(): Promise<
  (ProxyAllocation & {
    user: Pick<User, 'id' | 'email' | 'name'>;
    proxy: {
      id: number;
      ipAddress: string;
      port: number;
      status: string;
    };
  })[]
> {
  // Vue globale admin

  const rows = await db
    .select({
      allocation: proxyAllocations,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
      },
      proxy: {
        id: proxies.id,
        ipAddress: proxies.ipAddress,
        port: proxies.port,
        status: proxies.status,
      },
    })
    .from(proxyAllocations)
    .innerJoin(users, eq(proxyAllocations.userId, users.id))
    .innerJoin(proxies, eq(proxyAllocations.proxyId, proxies.id));

  return rows.map((row) => ({
    ...row.allocation,
    user: row.user,
    proxy: row.proxy,
  }));
}

export async function getAllTransactions(): Promise<
  (Funds & {
    user: Pick<User, 'id' | 'email' | 'name'>;
  })[]
> {
  // Vue financière
  const rows = await db
    .select({
      fund: funds,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
      },
    })
    .from(funds)
    .innerJoin(users, eq(funds.userId, users.id))
    .where(isNull(funds.deletedAt))
    .orderBy(funds.createdAt); // tu peux inverser si tu veux DESC

  return rows.map((row) => ({
    ...row.fund,
    user: row.user,
  }));
}

export async function getSystemStats() {
  // Santé globale du système
  const now = new Date();

  const [
    allUsers,
    activeAllocations,
    totalProxies,
    availableProxies,
    totalRevenue,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        deletedAt: users.deletedAt,
      })
      .from(users),
    db
      .select({
        id: proxyAllocations.id,
      })
      .from(proxyAllocations)
      .where(
        and(
          eq(proxyAllocations.status, 'active'),
          gt(proxyAllocations.endsAt, now)
        )
      ),
    db
      .select({ id: proxies.id, status: proxies.status })
      .from(proxies)
      .where(isNull(proxies.deletedAt)),
    getAvailableProxiesCount(),
    getTotalRevenue(), // sans userId => revenu global
  ]);

  const totalUsers = allUsers.length;
  const softDeletedUsers = allUsers.filter(
    (u) => u.deletedAt !== null
  ).length;
  const activeUsers = totalUsers - softDeletedUsers;

  const totalProxiesCount = totalProxies.length;
  const allocatedProxies = totalProxies.filter(
    (p) => p.status === 'allocated'
  ).length;

  return {
    totalUsers,
    activeUsers,
    softDeletedUsers,
    activeAllocations: activeAllocations.length,
    totalProxies: totalProxiesCount,
    availableProxies,
    allocatedProxies,
    totalRevenue,
  };
}

export async function suspendUser(userId: number): Promise<User | null> {
  // Coupe l’accès
  const user = await softDeleteUser(userId);
  return user;
}

export async function reinstateUser(userId: number): Promise<User | null> {
  // Restaure accès
  const user = await restoreUser(userId);
  return user;
}