/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
  eq,
  and,
  isNull,
  desc,
  gte,
  lte,
  sql,
} from 'drizzle-orm';

/* ======================
 * DATABASE INSTANCE
 * ====================== */

import { db } from '../drizzle';
import { startOfMonth, endOfMonth } from 'date-fns';

/* ======================
 * TABLES / SCHEMA
 * ====================== */

import {
  billing,
} from '../schema';

/* ======================
 * TYPES
 * ====================== */

import type {
  Billing,
} from '../schema';

// BILLING TYPES

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
 * HELPERS
 * ====================== */

/**
 * Génère un numéro de facture unique, suffisamment randomisé.
 */
export async function generateInvoiceNumber(userId?: number): Promise<string> {
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

/* ======================
 * BILLING / FACTURES
 * ====================== */

/**
 * Crée une facture "pending" pour un user.
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<Billing> {
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
  const now = new Date();

  const [row] = await db
    .insert(billing)
    .values({
      userId,
      amount,
      currency,
      status: 'pending',
      paymentMethod,
      dueDate,
      invoiceNumber: number,
      metadata,
      updatedAt: now,
      // Stripe uniquement si paymentMethod = 'stripe'
      paymentProvider: paymentMethod === 'stripe' ? 'stripe' : null,
      paymentReference: null,
      // lien wallet null par défaut
      walletFundsId: null,
    })
    .returning();

  return row;
}

/**
 * Marque une facture comme payée.
 */
export async function markInvoicePaid(
  invoiceId: number,
  options?: {
    paymentReference?: string | null;
    metadata?: Record<string, unknown> | null;
    walletFundsId?: number | null;
  }
): Promise<Billing | null> {
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

/**
 * Annule une facture, en mergeant éventuellement une raison dans la metadata.
 */
export async function cancelInvoice(
  invoiceId: number,
  reason?: string
): Promise<Billing | null> {
  const now = new Date();

  // On récupère l'ancienne metadata pour merge proprement
  const [existing] = await db
    .select({
      metadata: billing.metadata,
    })
    .from(billing)
    .where(and(eq(billing.id, invoiceId), isNull(billing.deletedAt)));

  let mergedMetadata: Record<string, unknown> | null = null;

  if (existing?.metadata && typeof existing.metadata === 'object') {
    mergedMetadata = { ...existing.metadata };
  }

  if (reason) {
    mergedMetadata = {
      ...(mergedMetadata ?? {}),
      cancelReason: reason,
    };
  }

  const [row] = await db
    .update(billing)
    .set({
      status: 'cancelled',
      updatedAt: now,
      metadata: mergedMetadata,
    })
    .where(and(eq(billing.id, invoiceId), isNull(billing.deletedAt)))
    .returning();

  return row ?? null;
}

/**
 * Liste les factures d'un utilisateur.
 */
export async function getUserInvoices(
  userId: number,
  options?: { includeDeleted?: boolean }
): Promise<Billing[]> {
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

/**
 * Récupère une facture par ID (sans les supprimées).
 */
export async function getInvoiceById(invoiceId: number): Promise<Billing | null> {
  const [row] = await db
    .select()
    .from(billing)
    .where(and(eq(billing.id, invoiceId), isNull(billing.deletedAt)));

  return row ?? null;
}

/**
 * Récupère une facture par numéro (sans les supprimées).
 */
export async function getInvoiceByNumber(
  invoiceNumber: string
): Promise<Billing | null> {
  const [row] = await db
    .select()
    .from(billing)
    .where(
      and(
        eq(billing.invoiceNumber, invoiceNumber),
        isNull(billing.deletedAt)
      )
    );

  return row ?? null;
}

/**
 * Soft delete d'une facture.
 */
export async function deleteInvoice(invoiceId: number): Promise<Billing | null> {
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

/**
 * Relance un paiement échoué :
 * - remet le statut à "pending"
 * - reset paidAt, paymentReference, walletFundsId
 * - garde le même paymentMethod / paymentProvider
 */
export async function retryPayment(
  invoiceId: number,
  options?: {
    metadata?: Record<string, unknown> | null;
  }
): Promise<Billing | null> {
  const now = new Date();

  const [row] = await db
    .update(billing)
    .set({
      status: 'pending',
      paidAt: null,
      paymentReference: null,
      walletFundsId: null,
      metadata: options?.metadata ?? null,
      updatedAt: now,
    })
    .where(and(eq(billing.id, invoiceId), isNull(billing.deletedAt)))
    .returning();

  return row ?? null;
}

/**
 * Retourne un résumé des factures d'un user :
 * - totaux par statut
 * - nombre de factures par type
 */
export async function getBillingSummary(userId: number): Promise<BillingSummary> {
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
    const amount = Number(row.amount);

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
        // failed / autres -> à gérer plus tard si besoin
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

/**
 * Total payé ce mois-ci (basé sur la date de paiement réelle).
 */
export async function getTotalPaidThisMonth(userId: number): Promise<number> {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());

  const result = await db
    .select({
      total: sql<number>`SUM(${billing.amount})`,
    })
    .from(billing)
    .where(
      and(
        eq(billing.userId, userId),
        eq(billing.status, 'paid'),
        isNull(billing.deletedAt),
        gte(billing.paidAt, start),
        lte(billing.paidAt, end)
      )
    );

  const raw = result[0]?.total ?? 0;
  return Number(raw);
}

/**
 * Stub : facturation mensuelle des proxies.
 * À implémenter quand on branchera les subscriptions/proxies.
 */
export async function createMonthlyInvoice() {
  // TODO: implémenter la facturation mensuelle des proxies
}
