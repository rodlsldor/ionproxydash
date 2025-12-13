// app/api/dashboard/help/route.ts
import { z } from 'zod';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import {
  createTicket,
  getUserTickets,
  type TicketStatus,
} from '@/lib/db/queries/tickets';
import { apiError, apiSuccess } from '@/lib/api/response';

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

  return apiSuccess(
    { tickets },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

export const POST = withAuthRoute(async (req, { auth }) => {
  const json = await req.json().catch(() => null);
  if (!json) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid JSON body',
      { reason: 'INVALID_JSON_BODY' }
    );
  }

  const parsed = createTicketSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid input',
      {
        reason: 'INVALID_INPUT',
        zod: parsed.error.flatten(),
        issues: parsed.error.issues,
      }
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

  return apiSuccess(
    { ticket },
    {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
});
