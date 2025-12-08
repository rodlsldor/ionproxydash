/* ======================
 * DRIZZLE CORE
 * ====================== */

import {
    tickets,
    type Ticket,
    type NewTicket,
} from '@/lib/db/schema';

/* ======================
* DATABASE INSTANCE
* ====================== */

import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

/* ======================
 * TABLES / SCHEMA
 * ====================== */

export type TicketStatus = Ticket['status'];
export type TicketPriority = Ticket['priority'];

export type CreateTicketInput = {
  userId: number;
  subject: string;
  message: string;
  category?: string | null;
  priority?: TicketPriority;
};

export type UpdateTicketStatusInput = {
  ticketId: number;
  status: TicketStatus;
};

export type ReplyToTicketInput = {
  ticketId: number;
  adminReply: string;
  status?: TicketStatus;
};

/* ======================
 * TYPES (OPTIONNEL MAIS PRATIQUE)
 * ====================== */

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const {
    userId,
    subject,
    message,
    category = null,
    priority = 'normal',
  } = input;

  const now = new Date();

  const [row] = await db
    .insert(tickets)
    .values({
      userId,
      subject,
      message,
      category,
      priority,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<NewTicket, 'id'>)
    .returning();

  return row;
}

/* ======================
 * TICKETS
 * ====================== */

export async function getUserTickets(
  userId: number,
  options?: {
    status?: TicketStatus;
    limit?: number;
    offset?: number;
  }
): Promise<Ticket[]> {

// Récupère les tickets d'un utilisateur avec des options facultatives
  const { status, limit = 50, offset = 0 } = options ?? {};

  return db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.userId, userId),
        isNull(tickets.deletedAt),
        status ? eq(tickets.status, status) : undefined
      )
    )
    .orderBy(desc(tickets.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getTicketByIdForUser(
  ticketId: number,
  userId: number
): Promise<Ticket | null> {

// Récupère un ticket spécifique pour un utilisateur donné
  const [row] = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.userId, userId),
        isNull(tickets.deletedAt)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function getAllTickets(options?: {
  status?: TicketStatus;
  limit?: number;
  offset?: number;
}): Promise<Ticket[]> {

// Récupère tous les tickets avec des options facultatives
  const { status, limit = 100, offset = 0 } = options ?? {};

  return db
    .select()
    .from(tickets)
    .where(
      and(
        isNull(tickets.deletedAt),
        status ? eq(tickets.status, status) : undefined
      )
    )
    .orderBy(desc(tickets.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateTicketStatus(
  input: UpdateTicketStatusInput
): Promise<Ticket | null> {

// Met à jour le statut d'un ticket
  const { ticketId, status } = input;
  const now = new Date();

  const [row] = await db
    .update(tickets)
    .set({
      status,
      updatedAt: now,
      closedAt:
        status === 'resolved' || status === 'closed' ? now : null,
    })
    .where(and(eq(tickets.id, ticketId), isNull(tickets.deletedAt)))
    .returning();

  return row ?? null;
}

export async function replyToTicket(
  input: ReplyToTicketInput
): Promise<Ticket | null> {

// Ajoute une réponse administrative à un ticket
  const { ticketId, adminReply, status } = input;
  const now = new Date();

  const patch: Partial<Ticket> = {
    adminReply,
    updatedAt: now,
  };

  if (status) {
    patch.status = status;
    if (status === 'resolved' || status === 'closed') {
      patch.closedAt = now;
    } else {
      patch.closedAt = null;
    }
  }

  const [row] = await db
    .update(tickets)
    .set(patch)
    .where(and(eq(tickets.id, ticketId), isNull(tickets.deletedAt)))
    .returning();

  return row ?? null;
}

export async function softDeleteTicket(
  ticketId: number
): Promise<Ticket | null> {

// Supprime en douceur un ticket (soft delete)
  const now = new Date();

  const [row] = await db
    .update(tickets)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(eq(tickets.id, ticketId), isNull(tickets.deletedAt)))
    .returning();

  return row ?? null;
}