// app/api/dashboard/billing/[invoiceId]/pdf/route.ts

import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { billing, users } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries/users';
import { generateInvoicePdf } from '@/lib/pdf/invoice';
export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const id = Number(invoiceId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 });
  }

  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [invoice] = await db
    .select()
    .from(billing)
    .where(
      and(
        eq(billing.id, id),
        eq(billing.userId, authUser.id),
        isNull(billing.deletedAt)
      )
    );

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id));

  const pdfBuffer = await generateInvoicePdf({
    invoice,
    user: userRow ?? authUser,
  });

  return new NextResponse(Buffer.from(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });

}
