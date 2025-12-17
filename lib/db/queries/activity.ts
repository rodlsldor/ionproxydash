/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  desc,
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
  activityLogs,
} from '../schema';
import { getUser } from '@/lib/db/queries';


/* ======================
 * AUTH / SESSION
 * ====================== */

import { cookies } from 'next/headers';


/* ======================
 * ACTIVITY LOGS/AUDIT
 * ====================== */

export async function logActivity(input: {
  userId: number | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await db.insert(activityLogs).values({
      userId: input.userId ?? null,
      action: input.action,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (e) {
    console.error('[logActivity] failed', e);
  }
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    return [];
  }

  return await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(50);
}

export async function getActivityLogsByUser(userId: number) {
  // Récupère tous les logs pour un user donné
  return await db
  .select()
  .from(activityLogs)
  .where(eq(activityLogs.userId, userId))
  .orderBy(desc(activityLogs.createdAt));
}

export async function purgeOldActivityLogs(days: number) {
  // Supprime les logs trop anciens (cron)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return await db
    .delete(activityLogs)
    .where(lt(activityLogs.createdAt, cutoff));
}

export async function getLastLogin(userId: number) {
  // Dernière connexion du user
  const [log] = await db
  .select()
  .from(activityLogs)
  .where(eq(activityLogs.userId, userId))
  .orderBy(desc(activityLogs.createdAt))
  .limit(1);

  return log || null;
}
