// app/api/dashboard/billing/route.ts
import { NextResponse } from 'next/server';

import { getUser } from '@/lib/db/queries';
import {
  getUserInvoices,
  getBillingSummary,
  getTotalPaidThisMonth,
} from '@/lib/db/queries/billing';

export async function GET(req: Request) {
  // 1) Auth : on récupère l'utilisateur courant
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2) Options via query params (ex: ?includeDeleted=true)
  const { searchParams } = new URL(req.url);
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  // 3) On charge tout en parallèle
  const [invoices, summary, paidThisMonth] = await Promise.all([
    getUserInvoices(user.id, { includeDeleted }),
    getBillingSummary(user.id),
    getTotalPaidThisMonth(user.id),
  ]);

  // 4) Réponse JSON pour le dashboard
  return NextResponse.json({
    invoices,
    summary,
    paidThisMonth,
  });
}
