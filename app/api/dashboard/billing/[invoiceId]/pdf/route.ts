// app/api/dashboard/billing/[invoiceId]/pdf/route.ts
import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { billing, users } from '@/lib/db/schema';
import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { generateInvoicePdf } from '@/lib/pdf/invoice';

export const runtime = 'nodejs';

export const GET = withAuthRoute(async (_req, { auth }) => {
  // NOTE: on récupère invoiceId depuis l'URL (pas besoin de params typed)
  // parce que withAuthRoute ne forward pas le ctx { params }.
  // Pattern: .../billing/123/pdf
  const url = new URL(_req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const invoiceId = parts.at(-2); // .../billing/{invoiceId}/pdf

  const id = Number(invoiceId);
  if (!invoiceId || Number.isNaN(id)) {
    return NextResponse.json({ error: 'INVALID_INVOICE_ID' }, { status: 400 });
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
    return NextResponse.json({ error: 'INVOICE_NOT_FOUND' }, { status: 404 });
  }

  const [userRow] = await db.select().from(users).where(eq(users.id, auth.user.id));

  const pdfBuffer = await generateInvoicePdf({
    invoice,
    user: userRow ?? auth.user,
  });

  return new NextResponse(Buffer.from(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
});
