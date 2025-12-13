// app/api/dashboard/billing/route.ts
import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import {
  getUserInvoices,
  getBillingSummary,
  getTotalPaidThisMonth,
} from '@/lib/db/queries/billing';
import { apiSuccess } from '@/lib/api/response';

export const GET = withAuthRoute(async (req, { auth }) => {
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  const [invoices, summary, paidThisMonth] = await Promise.all([
    getUserInvoices(user.id, { includeDeleted }),
    getBillingSummary(user.id),
    getTotalPaidThisMonth(user.id),
  ]);

  return apiSuccess(
    {
      invoices,
      summary,
      paidThisMonth,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
});
