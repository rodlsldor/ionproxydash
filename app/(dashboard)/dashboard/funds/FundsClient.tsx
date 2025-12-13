'use client';

import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

import { apiFetcher, apiPost } from '@/lib/api/fetcher';
import { useDashboardAuthGuard } from '@/lib/hooks/useDashboardAuthGuard';


/* =======================
 * SKELETONS
 * ======================= */

function BalanceSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Wallet Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function TransactionsSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* =======================
 * COMPONENTS
 * ======================= */

function WalletBalance({ balance }: { balance: number | string | null }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeBalance =
    typeof balance === 'number' ? balance : Number(balance ?? 0);
  const displayBalance = Number.isFinite(safeBalance) ? safeBalance : 0;

  const PRESET_AMOUNTS = [70, 100, 250, 500, 1000];

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-3xl font-semibold">
            ${displayBalance.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">
            Available funds for subscriptions and proxy usage.
          </p>
        </CardContent>

        <CardFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            Add funds
          </Button>
        </CardFooter>
      </Card>

      {/* ===== MODAL ADD FUNDS ===== */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 rounded-2xl">
            <CardHeader>
              <CardTitle>Add funds</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                IF YOU NEED REIMBURSEMENT CONTACT THE SUPPORT. Be careful of the amount you put in your wallet.
              </p>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);

                  const value = Number(amount);

                  if (!Number.isFinite(value)) {
                    setError('Please enter a valid amount');
                    return;
                  }

                  if (value < 70 || value > 1000) {
                    setError('Amount must be between $70 and $1000');
                    return;
                  }

                  setLoading(true);

                  try {
                    const data = await apiPost<{ url: string }>(
                      '/api/dashboard/funds/checkout',
                      { amount: value }
                    );

                    if (!data?.url) throw new Error('No Stripe URL returned');

                    window.location.href = data.url;
                    // pas besoin de setLoading(false) ici : on quitte la page
                  } catch (err) {
                    console.error(err);
                    setLoading(false);
                    setError(err instanceof Error ? err.message : 'Stripe checkout failed. Try again.');
                  }
                }}
                className="space-y-4"
              >

                {/* Montants prédéfinis */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Quick amounts
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_AMOUNTS.map((preset) => {
                      const isActive = Number(amount) === preset;
                      return (
                        <Button
                          key={preset}
                          type="button"
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          className="rounded-2xl"
                          onClick={() => {
                            setAmount(String(preset));
                            setError(null);
                          }}
                          disabled={loading}
                        >
                          ${preset}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Champ manuel */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    min={70}
                    max={1000}
                    step="1"
                    className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                    placeholder="70"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum amount: $70 — Maximum: $1000
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => {
                      setOpen(false);
                      setError(null);
                      setAmount('');
                      setLoading(false);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-2xl"
                    disabled={loading}
                  >
                    {loading ? 'Redirecting…' : 'Proceed to payment'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}





function TransactionsTable({
  transactions,
}: {
  transactions: {
    id: number;
    amount: number;
    type: string;
    status: string;
    createdAt: string | null;
  }[];
}) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Type</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0">
                  <td className="py-2">
                    {tx.createdAt
                      ? new Date(tx.createdAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="py-2 capitalize">
                    {tx.type === 'CREDIT' ? 'Credit' : 'Debit'}
                  </td>
                  <td className="py-2 capitalize text-muted-foreground">
                    {tx.status}
                  </td>
                  <td className="py-2 text-right font-medium">
                    ${tx.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

/* =======================
 * PAGE
 * ======================= */

export default function FundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();

  const { data, error, isLoading } = useSWR<{
    balance: number;
    transactions: {
      id: number;
      amount: number;
      type: string;
      status: string;
      createdAt: string | null;
    }[];
  }>('/api/dashboard/funds', apiFetcher);

  // Gérer retour Stripe: ?status=success&session_id=xxx
  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');

    if (status === 'success' && sessionId) {
      (async () => {
        try {
          await apiPost<{ ok: true }>('/api/dashboard/funds/confirm', { sessionId });
        } catch (err) {
          console.error('Confirm funds error:', err);
        } finally {
          mutate('/api/dashboard/funds');
          router.replace('/dashboard/funds');
        }
      })();
    }
  }, [searchParams, mutate, router]);


  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium lg:text-2xl">
        Wallet
      </h1>

      {isLoading && (
        <>
          <BalanceSkeleton />
          <TransactionsSkeleton />
        </>
      )}

      {!isLoading && error && (
        <p className="text-sm text-red-500">
          Failed to load wallet data.
        </p>
      )}

      {!isLoading && data && (
        <>
          <WalletBalance balance={data.balance} />
          <TransactionsTable transactions={data.transactions} />
        </>
      )}
    </section>
  );
}
