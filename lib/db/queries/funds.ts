/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  isNull,
  desc,
} from 'drizzle-orm';

/* ======================
 * DATABASE INSTANCE
 * ====================== */

import { db } from '../drizzle';

/* ======================
 * TABLES / SCHEMA
 * ====================== */

import {
  funds,
} from '../schema';

/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

import type {
  Funds,
  NewFunds,
} from '../schema';

//FUNDS TYPES

type FundTransactionType = 'credit' | 'debit';
type FundStatus = 'pending' | 'completed' | 'failed' | 'refunded';
type FundMetadata = NewFunds['metadata'];

type CreateFundTransactionInput = {
  userId: number;
  amount: number;
  transactionType: FundTransactionType;
  status?: FundStatus;
  currency?: string;
  transactionReference?: string | null;
  metadata?: FundMetadata;
  paymentProvider?: 'stripe' | null;
};

/* ======================
 * FUNDS/WALLET
 * ====================== */

export async function getUserBalance(userId: number): Promise<number> {
  // Calcul du solde actuel

  const rows = await db
    .select({
      amount: funds.amount,
      transactionType: funds.transactionType,
      status: funds.status,
    })
    .from(funds)
    .where(
      and(
        eq(funds.userId, userId),
        eq(funds.status, 'completed'),
        isNull(funds.deletedAt)
      )
    );

  let balance = 0;

  for (const row of rows) {
    const amount = Number(row.amount);

    if (!Number.isFinite(amount)) continue;

    if (row.transactionType === 'CREDIT') {
      balance += amount;
    } else if (row.transactionType === 'DEBIT') {
      balance -= amount;
    }
  }

  return Number(balance.toFixed(2));
}

export async function addFunds(input: {
  userId: number;
  amount: number;
  currency?: string;
  transactionReference?: string | null;
  metadata?: FundMetadata;
}): Promise<Funds> {

  const amount = Number(input.amount);

  // 1. Validation du montant
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  // 2. Crée la transaction de crédit
  return createFundTransaction({
    ...input,
    amount,
    transactionType: 'credit',
    status: 'completed',
  });
}


export async function deductFunds(input: {
  userId: number;
  amount: number;
  allowNegative?: boolean;
  currency?: string;
  transactionReference?: string | null;
  metadata?: FundMetadata;
}): Promise<Funds> {

  const { userId, allowNegative = false } = input;
  const amount = Number(input.amount);

  // 1. Validation
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  // 2. Récupère le solde réel
  const balance = Number(await getUserBalance(userId));

  // 3. Vérifie solvabilité
  if (!allowNegative && balance < amount) {
    throw new Error('Insufficient balance');
  }

  // 4. Crée la transaction
  return createFundTransaction({
    ...input,
    amount,
    transactionType: 'debit',
    status: 'completed',
  });
}


export async function refundFunds(input: {
  userId: number;
  amount: number;
  currency?: string;
  transactionReference?: string | null;
  metadata?: FundMetadata;
}): Promise<Funds> {
  if (input.amount <= 0) {
    throw new Error('Amount must be positive');
  }

  return createFundTransaction({
    ...input,
    transactionType: 'credit',
    status: 'refunded',
    paymentProvider: null,
  });
}

export async function getFundsHistory(userId: number): Promise<Funds[]> {
  // Historique des transactions

  return await db
    .select()
    .from(funds)
    .where(and(eq(funds.userId, userId), isNull(funds.deletedAt)))
    .orderBy(desc(funds.createdAt));
}

export async function createFundTransaction(input: CreateFundTransactionInput ): Promise<Funds> {
  // Crée une ligne funds

  const {
    userId,
    amount,
    transactionType,
    status = 'completed',
    currency = 'USD',
    transactionReference = null,
    metadata = null,
    paymentProvider = null,
  } = input;

  const safeAmount = Number(amount);

  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error('Invalid funds amount');
  }

  const dbTransactionType: NewFunds['transactionType'] =
    transactionType === 'credit' ? 'CREDIT' : 'DEBIT';

  const [row] = await db
    .insert(funds)
    .values({
      userId,
      amount: safeAmount,
      currency,
      transactionType: dbTransactionType,
      status,
      paymentProvider,
      transactionReference,
      metadata,
      updatedAt: new Date(),
    } satisfies Omit<NewFunds, 'id' | 'createdAt'>)
    .returning();

  return row;
}

export async function createPendingTopup(input: {
  userId: number;
  amount: number;
  currency?: string;
  metadata?: FundMetadata;
  paymentProvider?: 'stripe' | null;
}): Promise<Funds> {
  const {
    userId,
    amount,
    currency = 'USD',
    metadata = null,
    paymentProvider = 'stripe',
  } = input;

  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // On crée un CREDIT en statut "pending"
  return createFundTransaction({
    userId,
    amount,
    currency,
    transactionType: 'credit',
    status: 'pending',
    metadata,
    paymentProvider,
    transactionReference: null,
  });
}

export async function markFundsCompleted(
  fundsId: number,
  input: {
    transactionReference?: string | null;
    metadata?: FundMetadata;
  } = {}
): Promise<Funds | null> {
  const { transactionReference = null, metadata } = input;

  const [row] = await db
    .update(funds)
    .set({
      status: 'completed',
      transactionReference,
      metadata: metadata ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(funds.id, fundsId))
    .returning();

  return row ?? null;
}

export async function getFundsByIdForUser(
  fundsId: number,
  userId: number
): Promise<Funds | null> {
  const rows = await db
    .select()
    .from(funds)
    .where(
      and(
        eq(funds.id, fundsId),
        eq(funds.userId, userId),
        isNull(funds.deletedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}
