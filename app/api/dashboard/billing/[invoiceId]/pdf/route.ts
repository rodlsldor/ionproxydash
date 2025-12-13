// app/api/dashboard/billing/[invoiceId]/pdf/route.ts
import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { billing, users } from '@/lib/db/schema';
import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { generateInvoicePdf } from '@/lib/pdf/invoice';
import { apiError } from '@/lib/api/response';

export const runtime = 'nodejs';

export const GET = withAuthRoute(async (req, { auth }) => {
  // NOTE: on récupère invoiceId depuis l'URL (pas de params typed)
  // Pattern: .../billing/123/pdf
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const invoiceId = parts.at(-2); // .../billing/{invoiceId}/pdf

  const id = Number(invoiceId);
  if (!invoiceId || Number.isNaN(id)) {
    return apiError(
      'VALIDATION_ERROR',
      400,
      'Invalid invoice id',
      { field: 'invoiceId', reason: 'INVALID_INVOICE_ID', value: invoiceId }
    );
  }

  const [invoice] = await db
    .select()
    .from(billing)
    .where(
      and(
        eq(billing.id, id),
        eq(billing.userId, auth.user.id),
        isNull(billing.deletedAt)
      )
    );

  if (!invoice) {
    return apiError(
      'NOT_FOUND',
      404,
      'Invoice not found',
      { reason: 'INVOICE_NOT_FOUND', invoiceId: id }
    );
  }

  const [userRow] = await db.select().from(users).where(eq(users.id, auth.user.id));

  const pdfBuffer = await generateInvoicePdf({
    invoice,
    user: userRow ?? auth.user,
  });

  // ✅ Exception volontaire au contrat JSON :
  // cette route renvoie un PDF binaire (pas { ok: true, data })
  return new NextResponse(Buffer.from(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
});
