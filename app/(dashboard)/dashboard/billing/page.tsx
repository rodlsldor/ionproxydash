'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to fetch billing data');
    }
    return res.json();
  });

type InvoiceStatus = 'pending' | 'paid' | 'cancelled' | 'failed';

type Invoice = {
  id: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paymentMethod: 'stripe' | 'wallet';
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
};

type BillingSummary = {
  totalPaid: number;
  totalPending: number;
  totalCancelled: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  pendingInvoiceCount: number;
};

type BillingApiResponse = {
  invoices: Invoice[];
  summary: BillingSummary;
  paidThisMonth: number;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

  switch (status) {
    case 'paid':
      return (
        <span className={`${base} bg-emerald-100 text-emerald-700`}>
          Paid
        </span>
      );
    case 'pending':
      return (
        <span className={`${base} bg-amber-100 text-amber-700`}>
          Pending
        </span>
      );
    case 'cancelled':
      return (
        <span className={`${base} bg-gray-200 text-gray-700`}>
          Cancelled
        </span>
      );
    case 'failed':
    default:
      return (
        <span className={`${base} bg-red-100 text-red-700`}>
          Failed
        </span>
      );
  }
}

export default function BillingPage() {
  const { data, error, isLoading } = useSWR<BillingApiResponse>(
    '/api/dashboard/billing',
    fetcher
  );

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const closeModal = () => setSelectedInvoice(null);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              Failed to load billing data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-6">
        {/* Skeleton summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-6 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton table */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full rounded bg-muted animate-pulse"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invoices, summary, paidThisMonth } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Résumé */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(summary.totalPaid, 'USD')}
            </p>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Paid This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(paidThisMonth, 'USD')}
            </p>
            <p className="text-xs text-muted-foreground">
              Current calendar month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Pending Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summary.pendingInvoiceCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.totalPending, 'USD')} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Cancelled Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(summary.totalCancelled, 'USD')}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.invoiceCount} invoices total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau de factures */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any invoices yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Invoice</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Method</th>
                    <th className="py-2 pr-4">Due date</th>
                    <th className="py-2 pr-4">Paid at</th>
                    <th className="py-2 pr-4">Created at</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <td className="py-2 pr-4 font-mono text-xs sm:text-sm">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-2 pr-4">
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td className="py-2 pr-4 capitalize">
                        {inv.paymentMethod}
                      </td>
                      <td className="py-2 pr-4">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="py-2 pr-4">
                        {formatDate(inv.paidAt)}
                      </td>
                      <td className="py-2 pr-4">
                        {formatDate(inv.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL PDF FACTURE */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* Overlay + blur */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          {/* Fenêtre PDF */}
          <div className="relative z-50 w-full max-w-4xl rounded-lg bg-background shadow-lg border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Invoice {selectedInvoice.invoiceNumber}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)} ·{' '}
                  {selectedInvoice.status.toUpperCase()}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
            <div className="h-[70vh]">
              <iframe
                // 👉 À toi d’implémenter cette route côté backend :
                // /app/api/dashboard/billing/[id]/pdf/route.ts
                src={`/api/dashboard/billing/${selectedInvoice.id}/pdf`}
                className="h-full w-full rounded-b-lg"
                title={`Invoice ${selectedInvoice.invoiceNumber}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
