'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // enlève si tu ne l'as pas
import { Loader2, XCircle, ChevronDown } from 'lucide-react';
import type { Subscription } from '@/lib/db/schema';

import { apiFetcher, apiDelete } from '@/lib/api/fetcher';
import { useDashboardAuthGuard } from '@/lib/hooks/useDashboardAuthGuard';

type SubsResponse = {
  subscriptions: Subscription[];
};

// numeric -> string/number -> affichage propre
function formatAmount(value: unknown): string {
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(',', '.'));

  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toFixed(2);
}

export default function SubscriptionsPage() {
  const { data, error, isLoading, mutate } = useSWR<SubsResponse>(
    '/api/dashboard/subs',
    apiFetcher
  );

  useDashboardAuthGuard(error);

  const [cancelLoadingId, setCancelLoadingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  async function handleCancel(
    subscriptionId: number,
    options: { atPeriodEnd: boolean }
  ) {
    setCancelError(null);
    setCancelLoadingId(subscriptionId);

    try {
      const query = new URLSearchParams({
        id: String(subscriptionId),
        atPeriodEnd: String(options.atPeriodEnd),
      });

      await apiDelete<{ subscription: Subscription }>(
        `/api/dashboard/subs?${query.toString()}`
      );

      await mutate();
    } catch (err) {
      console.error('Cancel subscription error:', err);
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelLoadingId(null);
    }

  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">
        Subscriptions
      </h1>

      {isLoading && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Loading subscriptions...</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching your subscriptions
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-4 border-red-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              Failed to load subscriptions. Please try again later.
            </p>
          </CardContent>
        </Card>
      )}

      {cancelError && (
        <p className="mb-4 text-sm text-red-600">{cancelError}</p>
      )}

      {!isLoading && !error && (!data || data.subscriptions.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>No subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              You do not have any active subscriptions yet.
            </p>
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {data?.subscriptions.map((sub, index) => {
          const isCanceled = sub.status === 'canceled';
          const isCanceling = cancelLoadingId === sub.id;
          const nextBillingDate =
        sub.currentPeriodEnd ?? sub.cancelAt ?? null;
          const isOpen = openIds.has(sub.id);

          return (
        <Card key={sub.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
          <CardTitle className="flex items-center gap-3">
            Subscription #{sub.id}
            <Badge
              variant={
            sub.status === 'active'
              ? 'default'
              : sub.status === 'canceled'
              ? 'destructive'
              : 'outline'
              }
            >
              {sub.status}
            </Badge>
          </CardTitle>
          <p className="mt-1 text-sm text-gray-500">
            {sub.paymentMethod.toUpperCase()} •{' '}
            {formatAmount(sub.amountMonthly)} {sub.currency}
          </p>
            </div>

            <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 px-2"
          onClick={() =>
            setOpenIds((prev) => {
              const next = new Set(prev);
              if (next.has(sub.id)) {
            next.delete(sub.id);
              } else {
            next.add(sub.id);
              }
              return next;
            })
          }
            >
          <span>{isOpen ? 'Hide details' : 'Show details'}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
            </Button>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 text-sm text-gray-600">
            {nextBillingDate && (
              <p>
            Next billing date:{' '}
            <span className="font-medium">
              {new Date(nextBillingDate).toLocaleDateString()}
            </span>
              </p>
            )}
            {sub.cancelAt && (
              <p>
            Scheduled cancellation:{' '}
            <span className="font-medium">
              {new Date(sub.cancelAt).toLocaleDateString()}
            </span>
              </p>
            )}
            {sub.canceledAt && (
              <p>
            Canceled on:{' '}
            <span className="font-medium">
              {new Date(sub.canceledAt).toLocaleDateString()}
            </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isCanceled || isCanceling}
              onClick={() =>
            handleCancel(sub.id, { atPeriodEnd: true })
              }
            >
              {isCanceling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cancelling...
            </>
              ) : (
            'Cancel at period end'
              )}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              disabled={isCanceled || isCanceling}
              onClick={() =>
            handleCancel(sub.id, { atPeriodEnd: false })
              }
            >
              {isCanceling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cancelling...
            </>
              ) : (
            'Cancel now'
              )}
            </Button>
          </div>
            </div>

            {isOpen && (
          <div className="mt-4 border-t pt-4 space-y-2 text-xs text-gray-500">
            {/* ... tes détails ... */}
          </div>
            )}
          </CardContent>
        </Card>
          );
        })}

        {(data?.subscriptions.length ?? 0) > 0 && (
          <div className="flex justify-end">
            <Button
              className="rounded-2xl text-lg"
              variant="default"
              size="lg"
              onClick={() => window.location.href = '/pricing'}
            >
              Subscribe for More !
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
