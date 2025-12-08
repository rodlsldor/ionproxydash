// app/api/dashboard/help/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/db/queries';
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

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  if (
    statusParam &&
    (allowedStatuses as readonly string[]).includes(statusParam)
  ) {
    status = statusParam as TicketStatus;
  }

  const limit = limitParam ? Number(limitParam) || 50 : 50;
  const offset = offsetParam ? Number(offsetParam) || 0 : 0;

  const tickets = await getUserTickets(user.id, {
    status,
    limit,
    offset,
  });

  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createTicketSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { subject, message, category, priority } = parsed.data;

  const ticket = await createTicket({
    userId: user.id,
    subject,
    message,
    category: category ?? null,
    priority: priority ?? 'normal',
  });

  return NextResponse.json(ticket, { status: 201 });
}
