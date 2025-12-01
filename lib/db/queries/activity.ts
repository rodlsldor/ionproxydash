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


/* ======================
 * AUTH / SESSION
 * ====================== */

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

/* ======================
 * ACTIVITY LOGS/AUDIT
 * ====================== */

export async function logActivity(input: {
  userId: number;
  action: string;
  ipAddress?: string;
}) {
  // Enregistre une action dans activity_logs
  await db.insert(activityLogs).values({
    userId: input.userId,
    action: input.action,
    ipAddress: input.ipAddress ?? null,
  });
}

export async function getActivityLogs() {
  // Récupère les logs du user courant
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie) return [];

  const session = await verifyToken(sessionCookie.value);
  if (!session?.user?.id) return [];

  return await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, session.user.id))
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
