import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getTotalPaidThisMonth } from '@/lib/db/queries'; // là où tu l'as définie

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const total = await getTotalPaidThisMonth(user.id);

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    totalPaidThisMonth: total,
  });
}
