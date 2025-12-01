/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  isNull,
  lt,
  gt,
  gte,
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
  billing,
} from '../schema';

import { getUserBalance } from './funds';
import { getUserActiveProxies } from './allocations';

/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

//DASHBOARD STATS TYPE
type DashboardStats = {
  usedProxies: number;
  availableProxies: number;
  walletBalance: number;
  totalSpent: number;
  monthlySpent: number;
  plan: UserPlan;
};

export type UserPlan = {
  name: 'free' | 'starter' | 'pro' | 'enterprise';
  maxProxies: number;
  label: string;
};

/* ======================
 * DASHBOARD/STATISTICS
 * ====================== */

export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  // Statistiques globales pour l'UI
  const [
    usedProxies,
    availableProxies,
    walletBalance,
    totalSpent,
    monthlySpent,
    plan,
  ] = await Promise.all([
    getUsedProxiesCount(userId),
    getAvailableProxiesCount(),
    getWalletBalance(userId),
    getTotalRevenue(userId),
    getMonthlySpent(userId),
    getUserPlan(userId),
  ]);

  return {
    usedProxies,
    availableProxies,
    walletBalance,
    totalSpent,
    monthlySpent,
    plan,
  };
}

export async function getUsedProxiesCount(userId: number): Promise<number> {
  // Combien de proxies sont actifs
  const now = new Date();

  const rows = await db
    .select({
      proxyId: proxyAllocations.proxyId,
    })
    .from(proxyAllocations)
    .where(
      and(
        eq(proxyAllocations.userId, userId),
        eq(proxyAllocations.status, 'active'),
        gt(proxyAllocations.endsAt, now)
      )
    );

  // au cas où un proxy ait plusieurs allocations (normalement non)
  const uniqueProxyIds = new Set(rows.map((r) => r.proxyId));
  return uniqueProxyIds.size;
}

export async function getAvailableProxiesCount(): Promise<number> {
  // Combien sont disponibles
  const rows = await db
    .select({ id: proxies.id })
    .from(proxies)
    .where(
      and(
        eq(proxies.status, 'available'),
        isNull(proxies.deletedAt)
      )
    );

  return rows.length;
}

export async function getTotalRevenue(userId?: number): Promise<number> {
  // Total facturé
  const whereConditions = [
    eq(billing.status, 'paid' as const),
    isNull(billing.deletedAt),
  ];

  if (userId !== undefined) {
    whereConditions.push(eq(billing.userId, userId));
  }

  const rows = await db
    .select({
      amount: billing.amount,
    })
    .from(billing)
    .where(and(...whereConditions));

  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export async function getMonthlySpent(userId: number, year?: number, month?: number): Promise<number> {
  // Total mensuel
  const now = new Date();

  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1; // JS: 0–11

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1); // début du mois suivant

  const rows = await db
    .select({
      amount: billing.amount,
      createdAt: billing.createdAt,
    })
    .from(billing)
    .where(
      and(
        eq(billing.userId, userId),
        eq(billing.status, 'paid'),
        isNull(billing.deletedAt),
        gte(billing.createdAt, start),
        lt(billing.createdAt, end)
      )
    );

  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export async function getWalletBalance(userId: number): Promise<number> {
  // Balance simple
  return getUserBalance(userId);
}

export async function getUserPlan(userId: number): Promise<UserPlan> {
  // Simule ou renvoie un plan
  const activeProxies = await getUserActiveProxies(userId);
  const count = activeProxies.length;

  // Mapping simple du “plan” selon l’usage
  if (count === 0) {
    return {
      name: 'free',
      maxProxies: 1,
      label: 'Free',
      // priceHintMonthly: 0,
    };
  }

  if (count <= 3) {
    return {
      name: 'starter',
      maxProxies: 5,
      label: 'Starter',
      // priceHintMonthly: 29,
    };
  }

  if (count <= 10) {
    return {
      name: 'pro',
      maxProxies: 20,
      label: 'Pro',
      // priceHintMonthly: 79,
    };
  }

  // au-delà → gros client
  return {
    name: 'enterprise',
    maxProxies: 9999,
    label: 'Enterprise',
    // priceHintMonthly: 199,
  };
}