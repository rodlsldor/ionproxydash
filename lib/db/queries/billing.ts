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
  billing,
} from '../schema';

/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

import type {
  Billing,
  NewBilling,
} from '../schema';

//BILLING TYPES

type CreateInvoiceInput = {
  userId: number;
  amount: number;
  currency?: string;
  dueDate?: Date | null;
  metadata?: Record<string, unknown> | null;
  paymentMethod?: 'stripe' | 'wallet';
  invoiceNumber?: string;
};

type BillingSummary = {
  totalPaid: number;
  totalPending: number;
  totalCancelled: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  pendingInvoiceCount: number;
};

type InvoiceStatus = 'pending' | 'paid' | 'cancelled' | 'failed';

/* ======================
 * BILLING/FACTURES
 * ====================== */

export async function createInvoice(input: CreateInvoiceInput): Promise<Billing> {
  // Crée une facture

  const {
    userId,
    amount,
    currency = 'USD',
    dueDate = null,
    metadata = null,
    paymentMethod = 'stripe',
    invoiceNumber,
  } = input;

  if (amount <= 0) {
    throw new Error('Invoice amount must be positive');
  }

  const number = invoiceNumber ?? (await generateInvoiceNumber(userId));

  const values: Omit<NewBilling, 'id' | 'createdAt'> = {
    userId,
    amount,
    currency,
    status: 'pending',
    paymentMethod,          // ✅ nouveau champ
    dueDate,
    invoiceNumber: number,
    metadata,
    updatedAt: new Date(),
    // champs Stripe **uniquement si méthode = stripe**
    paymentProvider: paymentMethod === 'stripe' ? 'stripe' : null,
    paymentReference: null,
    // lien wallet à NULL par défaut
    walletFundsId: null,
  };

  const [row] = await db
    .insert(billing)
    .values(values)
    .returning();

  return row;
}

export async function markInvoicePaid(invoiceId: number, options?: {
  paymentReference?: string | null;
  metadata?: Record<string, unknown> | null;
  walletFundsId?: number | null;
}): Promise<Billing | null> {
  // Marque une facture comme payée

  const now = new Date();

  const [row] = await db
    .update(billing)
    .set({
      status: 'paid',
      paidAt: now,
      paymentReference: options?.paymentReference ?? null,
      metadata: options?.metadata ?? null,
      walletFundsId: options?.walletFundsId ?? null,
      updatedAt: now,
    })
    .where(and(eq(billing.id, invoiceId), isNull(billing.deletedAt)))
    .returning();

  return row ?? null;
}

export async function cancelInvoice(invoiceId: number, reason?: string): Promise<Billing | null> {
  // Annule une facture

  const now = new Date();

  // on merge éventuellement la raison dans metadata
  const [row] = await db
    .update(billing)
    .set({
      status: 'cancelled',
      updatedAt: now,
      metadata: reason
        ? { reason }
        : null,
    })
    .where(and(eq(billing.id, invoiceId), isNull(billing.deletedAt)))
    .returning();

  return row ?? null;
}

export async function getUserInvoices(userId: number, options?: {
  includeDeleted?: boolean
}): Promise<Billing[]> {
  // Liste des factures utilisateur

  const baseWhere = eq(billing.userId, userId);

  if (options?.includeDeleted) {
    return await db
      .select()
      .from(billing)
      .where(baseWhere)
      .orderBy(desc(billing.createdAt));
  }

  return await db
    .select()
    .from(billing)
    .where(and(baseWhere, isNull(billing.deletedAt)))
    .orderBy(desc(billing.createdAt));
}

export async function generateInvoiceNumber(userId?: number): Promise<string> {
  // Génère un numéro unique

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  const datePart = `${now.getFullYear()}${pad(
    now.getMonth() + 1
  )}${pad(now.getDate())}`;

  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');

  const userPart = userId ? `U${userId}` : 'UXXX';

  return `INV-${datePart}-${userPart}-${rand}`;
}

export async function createMonthlyInvoice() {
  // Facturation mensuelle des proxies
}

export async function getBillingSummary(userId: number): Promise<BillingSummary> {
  // Total payé, factures actives, etc.
  const rows = await db
    .select({
      amount: billing.amount,
      status: billing.status,
    })
    .from(billing)
    .where(and(eq(billing.userId, userId), isNull(billing.deletedAt)));

  let totalPaid = 0;
  let totalPending = 0;
  let totalCancelled = 0;
  let invoiceCount = 0;
  let paidInvoiceCount = 0;
  let pendingInvoiceCount = 0;

  for (const row of rows) {
    invoiceCount++;
    const amount = row.amount;

    switch (row.status as InvoiceStatus) {
      case 'paid':
        totalPaid += amount;
        paidInvoiceCount++;
        break;
      case 'pending':
        totalPending += amount;
        pendingInvoiceCount++;
        break;
      case 'cancelled':
        totalCancelled += amount;
        break;
      default:
        // failed / autres -> tu peux les gérer plus tard si besoin
        break;
    }
  }

  return {
    totalPaid,
    totalPending,
    totalCancelled,
    invoiceCount,
    paidInvoiceCount,
    pendingInvoiceCount,
  };
}

export async function deleteInvoice(invoiceId: number): Promise<Billing | null> {
  // Soft delete facture
  const now = new Date();

  const [row] = await db
    .update(billing)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(billing.id, invoiceId))
    .returning();

  return row ?? null;
}

export async function retryPayment(invoiceId: number, options?: {
  paymentProvider?: string | null;
  paymentReference?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<Billing | null> {
  // Relance un paiement échoué

  const now = new Date();

  const [row] = await db
    .update(billing)
    .set({
      status: 'pending',
      paidAt: null,
      paymentReference: null,   // on reset la référence Stripe précédente
      walletFundsId: null,     // on reset le lien wallet éventuel
      metadata: options?.metadata ?? null,
      updatedAt: now,
    })
    .where(and(eq(billing.id, invoiceId), isNull(billing.deletedAt)))
    .returning();

  return row ?? null;
}
