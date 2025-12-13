// src/lib/next-auth.ts

import NextAuth, { type NextAuthConfig } from 'next-auth';

import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';

import { getUserByEmail } from './db/queries';
import { DrizzleAdapter } from '@auth/drizzle-adapter';

import { db } from '@/lib/db/drizzle';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from '@/lib/db/schema';
import { comparePasswords } from '@/lib/auth/password';

/* =========================
 * DRIZZLE ADAPTER
 * ========================= */

const adapter = DrizzleAdapter(db, {
  usersTable: users as any,
  accountsTable: accounts as any,
  sessionsTable: sessions as any,
  verificationTokensTable: verificationTokens as any,
}) as any;

/* =========================
 * CONFIG AUTH.JS
 * ========================= */

export const authConfig: NextAuthConfig = {
  adapter,
  session: {
    strategy: 'jwt' as const,
  },
  providers: [
    // ⚠️ IMPORTANT : on APPELLE les providers → on passe des objets, pas les fonctions
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Credentials({
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 1) On récupère et on caste proprement
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        // 2) Chercher l'utilisateur par email
        const user = await getUserByEmail(email);
        if (!user) {
          return null;
        }

        // 3) Compte OAuth-only → pas de login password
        if (!user.passwordHash) {
          return null;
        }

        // 4) Vérifier le mot de passe
        const isValid = await comparePasswords(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // 5) OK → user au format Auth.js
        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? null,
          image: user.avatarUrl ?? null,
        };
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.picture = user.image ?? token.picture ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.user.image = token.picture ?? session.user.image ?? null;
      return session;
    },
  },
};

/* =========================
 * EXPORTS NEXT-AUTH v5
 * ========================= */

export const {
  auth,
  handlers: { GET, POST },
  signIn,
  signOut,
} = NextAuth(authConfig);
