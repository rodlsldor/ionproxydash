// app/api/dashboard/funds/route.ts
import { NextResponse } from 'next/server';

import { withAuthRoute } from '@/lib/auth/withAuthRoute';
import { getUserBalance, getFundsHistory } from '@/lib/db/queries/funds';

export const GET = withAuthRoute(async (_req, { auth }) => {
  const userId = auth.user.id;

  const balanceRaw = await getUserBalance(userId);
  const balance = typeof balanceRaw === 'number' ? balanceRaw : Number(balanceRaw ?? 0);

  const history = await getFundsHistory(userId);

  const visible = history
    .filter((tx) => tx.status === 'completed' || tx.status === 'refunded')
    .slice(0, 30);

  const transactions = visible.map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    type: tx.transactionType,
    status: tx.status,
    createdAt: tx.createdAt ? tx.createdAt.toISOString() : null,
  }));

  return NextResponse.json(
    { balance, transactions },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
