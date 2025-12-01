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
    const amount = row.amount;

    if (row.transactionType === 'CREDIT') {
      balance += amount;
    } else if (row.transactionType === 'DEBIT') {
      balance -= amount;
    }
  }

  return balance;
}

export async function addFunds(input: {
  userId: number;
  amount: number;
  currency?: string;
  transactionReference?: string | null;
  metadata?: FundMetadata;
}): Promise<Funds> {
  // Crédit le wallet

  // 1. Valide le montant
  if (input.amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // 2. Crée la transaction de crédit
  return createFundTransaction({
    ...input,
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
  // Débite un montant

  const { userId, amount, allowNegative = false } = input;

  // Vérifie le solde disponible
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const balance = await getUserBalance(userId);

  // S'il n'y a pas assez de fonds
  if (!allowNegative && balance < amount) {
    throw new Error('Insufficient balance');
  }

  // Crée la transaction de débit
  return createFundTransaction({
    ...input,
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

  if (amount <= 0) {
    throw new Error('Funds amount must be positive');
  }

  const dbTransactionType: NewFunds['transactionType'] =
    transactionType === 'credit' ? 'CREDIT' : 'DEBIT';

  const [row] = await db
    .insert(funds)
    .values({
      userId,
      amount,
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
