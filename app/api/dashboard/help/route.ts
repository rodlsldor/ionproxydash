// app/api/dashboard/help/route.ts
import { z } from 'zod';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import {
  createTicket,
  getUserTickets,
  type TicketStatus,
} from '@/lib/db/queries/tickets';
import { apiError, apiSuccess } from '@/lib/api/response';

/* ============================
 * ZOD SCHEMAS
 * ============================ */

// POST body
const createTicketSchema = z.object({
  subject: z.string().min(3).max(255),
  message: z.string().min(5),
  category: z.string().max(50).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

// GET query
const listTicketsQuerySchema = z.object({
  status: z
    .enum(['open', 'in_progress', 'waiting', 'resolved', 'closed'])
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),
});

/* ============================
 * GET /dashboard/help
 * ============================ */

export const GET = withAuthRoute(async (req, { auth }) => {
  const query = Object.fromEntries(new URL(req.url).searchParams);

  const parsed = listTicketsQuerySchema.safeParse(query);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid query parameters',
      {
        reason: 'INVALID_QUERY',
        zod: parsed.error.flatten(),
        issues: parsed.error.issues,
      }
    );
  }

  const { status, limit, offset } = parsed.data;

  const tickets = await getUserTickets(auth.user.id, {
    status: status as TicketStatus | undefined,
    limit,
    offset,
  });

  return apiSuccess(
    { tickets },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

/* ============================
 * POST /dashboard/help
 * ============================ */

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
