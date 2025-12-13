'use client';

/* =======================
 * IMPORTS
 * ======================= */
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

import { apiFetcher, apiPost } from '@/lib/api/fetcher';
import { useDashboardAuthGuard } from '@/lib/hooks/useDashboardAuthGuard';
import { useSWRConfig } from 'swr'; // pour mutate après création

import { ApiError } from '@/lib/api/fetcher';

/* =======================
 * SKELETONS
 * ======================= */

function OpenTicketsSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Open Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <p className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function NeedHelpSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Need Help?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function ClosedTicketsSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Closed Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <p className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

/* =======================
 * MAIN COMPONENT
 * ======================= */

interface Ticket {
  id: number;
  subject: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority?: string;
  createdAt?: string;
  message?: string;
  adminReply?: string;
}

interface OpenTicketsProps {
  tickets: Ticket[];
}

interface ClosedTicketsProps {
  tickets: Ticket[];
}

function OpenTickets({ tickets }: OpenTicketsProps) {
  const openTickets = tickets.filter((t) =>
    ['open', 'in_progress', 'waiting'].includes(t.status)
  );

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleClose = () => setSelectedTicket(null);

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Open Tickets</CardTitle>
          <p className="text-sm text-muted-foreground">
            {openTickets.length === 0
              ? 'No open support requests.'
              : `${openTickets.length} open support request${
                  openTickets.length > 1 ? 's' : ''
                }`}
          </p>
        </CardHeader>
        <CardContent>
          {openTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any open tickets right now.
            </p>
          ) : (
            <ScrollArea className="h-[220px] w-full">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10 border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2">Subject</th>
                      <th className="py-2 pr-2">Priority</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="border-b last:border-0 hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <td className="py-2 pr-2 font-medium">{ticket.subject}</td>
                        <td className="py-2 pr-2 capitalize text-muted-foreground">
                          {ticket.priority ?? 'normal'}
                        </td>
                        <td className="py-2 pr-2 capitalize">
                          {ticket.status.replace('_', ' ')}
                        </td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Dialog
            open={!!selectedTicket}
            onOpenChange={(open) => !open && handleClose()}
          >
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <DialogDescription>
                  Status: {selectedTicket.status.replace('_', ' ')} · Priority:{' '}
                  {selectedTicket.priority ?? 'normal'}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 text-sm text-muted-foreground">
                <p>Ticket #{selectedTicket.id}</p>
                <p>
                  Created:{' '}
                  {selectedTicket.createdAt
                    ? new Date(selectedTicket.createdAt).toLocaleString()
                    : '—'}
                </p>
                <p className="mt-2">
                  Priority : {selectedTicket.priority ?? 'normal'}
                </p>
                <p className="mt-2">
                  Message :
                  <span className="block mt-1 whitespace-pre-wrap text-amber-50">
                    {selectedTicket.message}
                  </span>
                </p>
              </div>
              <DialogFooter>
                <p className="text-sm text-muted-foreground">
                  Click outside the modal or the button below to close.
                </p>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}

function ClosedTickets({ tickets }: ClosedTicketsProps) {
  const closedTickets = tickets.filter((t) => t.status === 'closed');

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleClose = () => setSelectedTicket(null);

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Closed Tickets</CardTitle>
          <p className="text-sm text-muted-foreground">
            {closedTickets.length === 0
              ? 'No closed support requests.'
              : `${closedTickets.length} closed support request${
                  closedTickets.length > 1 ? 's' : ''
                }`}
          </p>
        </CardHeader>
        <CardContent>
          {closedTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any closed tickets yet.
            </p>
          ) : (
              <ScrollArea className="h-[220px] w-full">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background z-10 border-b">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2">Subject</th>
                        <th className="py-2 pr-2">Priority</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2 pr-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="border-b last:border-0 hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <td className="py-2 pr-2 font-medium">{ticket.subject}</td>
                          <td className="py-2 pr-2 capitalize text-muted-foreground">
                            {ticket.priority ?? 'normal'}
                          </td>
                          <td className="py-2 pr-2 capitalize">
                            {ticket.status.replace('_', ' ')}
                          </td>
                          <td className="py-2 pr-2 text-xs text-muted-foreground">
                            {ticket.createdAt
                              ? new Date(ticket.createdAt).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>

          )}
        </CardContent>
      </Card>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Dialog
            open={!!selectedTicket}
            onOpenChange={(open) => !open && handleClose()}
          >
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <DialogDescription>
                  Status: {selectedTicket.status.replace('_', ' ')} · Priority:{' '}
                  {selectedTicket.priority ?? 'normal'}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 text-sm text-muted-foreground">
                <p>Ticket #{selectedTicket.id}</p>
                <p>
                  Created:{' '}
                  {selectedTicket.createdAt
                    ? new Date(selectedTicket.createdAt).toLocaleString()
                    : '—'}
                </p>
                <p className="mt-2">
                  Priority : {selectedTicket.priority ?? 'normal'}
                </p>
                <p className="mt-2">
                  Message :
                  <span className="block mt-1 whitespace-pre-wrap text-amber-50">
                    {selectedTicket.message}
                  </span>
                </p>
                <p className="mt-2">
                  Reply from admin :
                  <span className="block mt-1 whitespace-pre-wrap text-amber-50">
                    {selectedTicket.adminReply}
                  </span>
                </p>
              </div>
              <DialogFooter>
                <p className="text-sm text-muted-foreground">
                  Click outside the modal or the button below to close.
                </p>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}



function NeedHelp() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const { mutate } = useSWRConfig();

    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message.');
      return;
    }

    try {
      setLoading(true);

      await apiPost<void>('/api/dashboard/help', {
        subject,
        message,
        // priority, category si tu ajoutes des states
      });

      setSuccess('Ticket created successfully ✅');
      setSubject('');
      setMessage('');

      mutate('/api/dashboard/help'); // refresh la liste
      // option: setOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message ?? 'Failed to create ticket.');
      } else {
        setError('Unexpected error.');
      }
    } finally {
      setLoading(false);
    }

  }

  return (
    <>
      {/* Card principale dans la page */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Need to create a new help ticket? Click the button below and describe your issue.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            className="my-1 flex justify-start shadow-none rounded-2xl text-sm"
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            Create New Ticket
          </Button>
        </CardFooter>
      </Card>

      {/* Overlay + modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>Create a support ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Subject</label>
                  <input
                    className="w-full border border-input bg-background px-3 py-2 text-sm rounded-2xl"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Billing issue, proxy down, feature request…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm rounded-2xl"
                    defaultValue="normal"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue in as much detail as possible."
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="text-sm text-emerald-500">
                    {success}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2 rounde">
                  <Button
                    className='rounded-2xl'
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="rounded-2xl" type="submit" size="sm" disabled={loading}>
                    {loading ? 'Creating…' : 'Create ticket'}
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



/* =======================
 * PAGE COMPONENT
 * ======================= */

export default function HelpPage() {

  const { data, error, isLoading } = useSWR<{ tickets: Ticket[] }>(
    '/api/dashboard/help',
    apiFetcher
  );

  useDashboardAuthGuard(error);

  let openTickets = 0;
  let closedTickets = 0;
  
  if (data?.tickets) {
    openTickets = data.tickets.filter((t) =>
      ['open', 'in_progress', 'waiting'].includes(t.status)
    ).length;

    closedTickets = data.tickets.filter((t) =>
      ['resolved', 'closed'].includes(t.status)
    ).length;
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">
        Help Center
      </h1>

      {isLoading && (
        <>
          <OpenTicketsSkeleton />
          <ClosedTicketsSkeleton />
          <NeedHelpSkeleton />
        </>
      )}

      {!isLoading && error && (
        <p className="text-sm text-red-500">
          Failed to load tickets. Please try again later.
        </p>
      )}

      {!isLoading && !error && data && (
        <>
          <OpenTickets tickets={data.tickets} />
          <ClosedTickets tickets={data.tickets} />
          <NeedHelp />
        </>
      )}
    </section>
  );
}
