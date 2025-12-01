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
} from '../schema';


/* ======================
 * AUTH / SESSION
 * ====================== */

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { compare } from 'bcryptjs';

/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

import type {
  User,
} from '../schema';


/* ======================
 * AUTH/USERS
 * ====================== */

export async function getUser() {
  // Récupère l'utilisateur courant depuis le cookie de session
  // 1. Récupère le cookie de session
  const sessionCookie = (await cookies()).get('session');

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  // 2. Vérifie le token JWT / session
  const sessionData = await verifyToken(sessionCookie.value);

  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  // 3. Vérifie que la session n'est pas expirée
  const expiresAt = new Date(sessionData.expires);
  if (expiresAt < new Date()) {
    return null;
  }

  // 4. Récupère l'utilisateur depuis la base
  const result = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, sessionData.user.id),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  // 5. Si aucun user trouvé
  if (result.length === 0) {
    return null;
  }

  // 6. Retourne l'utilisateur
  return result[0];
}

export async function getUserById(userId: number) {
  // Récupère un user par ID

  // 1. Récupère l'utilisateur depuis la base
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
  
  // 2. Si aucun user trouvé
  if (result.length === 0) {
    return null;
  }

  // 3. Retourne l'utilisateur
  return result[0];
}

export async function getUserByEmail(email: string) {
  // Retourne un utilisateur via son email

  // 1. Récupère l'utilisateur depuis la base
  const result = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, email),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  // 2. Si aucun user trouvé
  if (result.length === 0) {
    return null;
  }

  // 3. Retourne l'utilisateur
  return result[0];
}

export async function isEmailUsedByAnotherUser(email: string, userId: number) {
  //Raccourci pour vérifier si un email est utilisé par un autre user
  const user = await getUserByEmail(email);
  return user !== null && user.id !== userId;
}

export async function createUser(input: {
  name?: string | null;
  email: string;
  passwordHash: string;
}): Promise<User> {
  // 1. Vérifie si l’email est déjà pris
  const existing = await getUserByEmail(input.email);

  if (existing) {
    throw new Error('Email already in use');
  }

  // 2. Crée le user en BDD
  const [user] = await db
    .insert(users)
    .values({
      name: input.name ?? null,
      email: input.email,
      passwordHash: input.passwordHash,
    })
    .returning();
  
  // 3. Retourne le user créé
  return user;
}

export async function updateUser(
  userId: number,
  data: {
    name?: string | null;
    email?: string;
  }
) {
  // Modifie le profil utilisateur (nom, email, etc.)

  // 1. Vérifier si l'utilisateur existe
  if (data.email && await isEmailUsedByAnotherUser(data.email, userId)) {
    throw new Error('Email already in use');
  }

  // 2. Si l'email est modifié, vérifier qu'il n'est pas déjà utilisé
  if (data.email) {
    const existing = await getUserByEmail(data.email);
    if (existing && existing.id !== userId) {
      throw new Error('Email already in use');
    }
  }

  // 3. Mettre à jour l'utilisateur
  const [updatedUser] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser;
}

export async function softDeleteUser(userId: number) {
  // Soft delete (deleted_at) au lieu de supprimer réellement

  // 1. Met à jour le champ deletedAt et updatedAt
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

export async function restoreUser(userId: number) {
  // Réactive un user supprimé

  // 1. Met à jour le champ deletedAt et updatedAt
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

export async function updatePassword(userId: number, newPasswordHash: string) {
  // Modifie le mot de passe

  // Modifie le mot de passe (hash déjà calculé en amont)
  const [updatedUser] = await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
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

export async function verifyUserCredentials(email: string, passwordPlain: string) {
  // Vérifie email + password (login)

  // 1. On récupère l'utilisateur actif par email
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  // 2. Compare le mot de passe fourni avec le hash
  const isValid = await compare(passwordPlain, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // 3. Credentials OK → on retourne le user
  return user;
}

export async function userExists(email: string) {
  // Vérifie si un email est déjà pris (user actif)
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.email, email),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0;
}
