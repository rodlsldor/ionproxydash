/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  isNull,
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
  type User,
} from '../schema';

/* ======================
 * AUTH / SESSION
 * ====================== */

import { auth } from '@/lib/next-auth';
import { compare } from 'bcryptjs';

/* ======================
 * CONSTANTES "SECURITÉ"
 * ====================== */

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

/* ======================
 * HELPERS INTERNES
 * ====================== */

async function findActiveUserById(userId: number): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

async function findActiveUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);

  const result = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, normalized),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  return result[0] ?? null;
}



/* ======================
 * AUTH/SESSION → getUser()
 * ====================== */

export async function getUser(): Promise<User | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const email = session.user.email;

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, email),
        isNull(users.deletedAt) // si tu veux exclure les soft-deleted
      )
    )
    .limit(1);

  return user ?? null;
}



/* ======================
 * QUERIES UTILISATEUR
 * ====================== */

export async function getUserById(userId: number): Promise<User | null> {
  return findActiveUserById(userId);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return findActiveUserByEmail(email);
}

export async function isEmailUsedByAnotherUser(
  email: string,
  userId: number
): Promise<boolean> {
  const user = await findActiveUserByEmail(email);
  return user !== null && user.id !== userId;
}

/**
 * Création d'utilisateur
 * - vérifie unicité email
 * - stocke le hash du mot de passe
 * - accepte quelques champs de profil de base
 */
export async function createUser(input: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  countryOfResidence?: string | null;
  language?: string | null;
  timezone?: string | null;
  email: string;
  passwordHash: string;
}): Promise<User> {
  const normalizedEmail = normalizeEmail(input.email);

  // 1. Vérifie si l’email est déjà pris
  const existing = await findActiveUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('Email already in use');
  }

  const now = new Date();

  // 2. Crée le user en BDD
  const [user] = await db
    .insert(users)
    .values({
      name: input.name ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      countryOfResidence: input.countryOfResidence ?? null,
      language: input.language ?? undefined,
      timezone: input.timezone ?? null,
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      passwordUpdatedAt: now,
      // createdAt / updatedAt → defaultNow()
    })
    .returning();

  return user;
}

export async function updateUser(
  userId: number,
  data: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    countryOfResidence?: string | null;
    language?: string | null;
    timezone?: string | null;
    email?: string;
  }
): Promise<User | null> {
  // 1. Si l'email change, on vérifie qu'il n'est pas déjà utilisé
  let emailToSet: string | undefined = undefined;

  if (data.email) {
    emailToSet = normalizeEmail(data.email);
    if (await isEmailUsedByAnotherUser(emailToSet, userId)) {
      throw new Error('Email already in use');
    }
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      ...data,
      ...(emailToSet ? { email: emailToSet } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, userId),
        isNull(users.deletedAt)
      )
    )
    .returning();

  return updatedUser ?? null;
}


/**
 * Soft delete user
 * - marque deletedAt
 * - ne supprime pas physiquement
 */
export async function softDeleteUser(userId: number): Promise<User | null> {
  const [updatedUser] = await db
    .update(users)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser ?? null;
}

/**
 * Restore user supprimé (soft delete)
 * - remet deletedAt à NULL
 */
export async function restoreUser(userId: number): Promise<User | null> {
  const [updatedUser] = await db
    .update(users)
    .set({
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser ?? null;
}

/**
 * Mise à jour du mot de passe
 * - met à jour passwordHash
 * - met à jour passwordUpdatedAt
 */
export async function updatePassword(
  userId: number,
  newPasswordHash: string
): Promise<User | null> {
  const now = new Date();

  const [updatedUser] = await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      passwordUpdatedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(users.id, userId),
        isNull(users.deletedAt)
      )
    )
    .returning();

  return updatedUser ?? null;
}

/**
 * Vérifie les credentials (email + mot de passe)
 * - renvoie null si mauvais mot de passe ou compte locké
 * - incrémente failedLoginAttempts en cas d’échec
 * - lock le compte après X tentatives
 * - remet failedLoginAttempts à 0 si succès
 */
export async function verifyUserCredentials(
  email: string,
  passwordPlain: string
): Promise<User | null> {
  const user = await findActiveUserByEmail(email);
  if (!user) {
    return null;
  }

  const now = new Date();

  // 1. Vérifie si le compte est verrouillé
  if (user.accountLockedUntil && user.accountLockedUntil > now) {
    return null;
  }

  // 2. Compare le mot de passe fourni avec le hash
  if (!user.passwordHash) {
    return null;
  }
  const isValid = await compare(passwordPlain, user.passwordHash);

  if (!isValid) {
    const failedAttempts = (user.failedLoginAttempts ?? 0) + 1;

    let lockUntil: Date | null = null;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      lockUntil = new Date(
        now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000
      );
    }

    await db
      .update(users)
      .set({
        failedLoginAttempts: failedAttempts,
        accountLockedUntil: lockUntil,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    return null;
  }

  // 3. Credentials OK → reset compteur et lock
  const [updatedUser] = await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))
    .returning();

  return updatedUser ?? user;
}

/**
 * Vérifie simplement si un email est déjà pris (user actif)
 */
export async function userExists(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.email, normalized),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0;
}


function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
