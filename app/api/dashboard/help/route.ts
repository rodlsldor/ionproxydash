// app/api/dashboard/help/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import {
  createTicket,
  getUserTickets,
  type TicketStatus,
} from '@/lib/db/queries/tickets';

const createTicketSchema = z.object({
  subject: z.string().min(3).max(255),
  message: z.string().min(5),
  category: z.string().max(50).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

export const GET = withAuthRoute(async (req, { auth }) => {
  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');

  const allowedStatuses = [
    'open',
    'in_progress',
    'waiting',
    'resolved',
    'closed',
  ] as const;

  let status: TicketStatus | undefined;
  if (statusParam && (allowedStatuses as readonly string[]).includes(statusParam)) {
    status = statusParam as TicketStatus;
  }

  const limit = limitParam ? Number(limitParam) || 50 : 50;
  const offset = offsetParam ? Number(offsetParam) || 0 : 0;

  const tickets = await getUserTickets(auth.user.id, { status, limit, offset });

  return NextResponse.json(
    { tickets },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

export const POST = withAuthRoute(async (req, { auth }) => {
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: 'INVALID_JSON_BODY' }, { status: 400 });
  }

  const parsed = createTicketSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { subject, message, category, priority } = parsed.data;

  const ticket = await createTicket({
    userId: auth.user.id,
    subject,
    message,
    category: category ?? null,
    priority: priority ?? 'normal',
  });

  return NextResponse.json(ticket, {
    status: 201,
    headers: { 'Cache-Control': 'no-store' },
  });
});
