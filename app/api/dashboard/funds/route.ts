// app/api/dashboard/funds/route.ts
import { NextResponse } from 'next/server';

import { getUser } from '@/lib/db/queries/users'; // ou '@/lib/db/queries'
import { getUserBalance, getFundsHistory } from '@/lib/db/queries/funds';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1) Solde actuel
  const balanceRaw = await getUserBalance(user.id);

  const balance =
  typeof balanceRaw === 'number'
    ? balanceRaw
    : Number(balanceRaw ?? 0);
  // 2) Historique, puis on garde les 30 plus récents
  const history = await getFundsHistory(user.id);

  // Bonus : on peut ne montrer que les opérations qui impactent réellement
  // le wallet aux yeux de l'utilisateur (completed + refunded)
  const visible = history
    .filter((tx) => tx.status === 'completed' || tx.status === 'refunded')
    .slice(0, 30);

  const transactions = visible.map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    type: tx.transactionType, // 'CREDIT' | 'DEBIT'
    status: tx.status,
    createdAt: tx.createdAt ? tx.createdAt.toISOString() : null,
  }));

  return NextResponse.json({
    balance,
    transactions,
  });
}
