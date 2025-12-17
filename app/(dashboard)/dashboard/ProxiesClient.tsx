'use client';

import * as React from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { X } from "lucide-react";

import { useRouter } from 'next/navigation';
import { apiFetcher } from '@/lib/api/fetcher';
import { useDashboardAuthGuard } from '@/lib/hooks/useDashboardAuthGuard';

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";


type DashboardOverview = {
  invoices: number;
  currency: string;
  activeSubscription: {
    nbSubs: number;
    nextInvoiceAt: string | null;
  } | null;
  proxiesInUse: {
    active: number;
    total: number | null;
  };
  bandwidth: {
    points: {
      bucket: string;   // ISO string
      bytesIn: number;
      bytesOut: number;
      bytesTotal: number;
    }[];
  };
};

type ApiProxy = {
  allocationId: number;
  proxyId: number;
  label: string | null;
  ipAddress: string;
  port: number;
  location: string | null;
  isp: string | null;
  status: 'available' | 'allocated' | 'maintenance' | 'disabled';
  dongleId: string | null;
  lastHealthCheck: string | null;
  startsAt: string;
  endsAt: string | null;
};

type BandwidthPoint = {
  bucket: string; // ISO string
  bytesIn: number;
  bytesOut: number;
  bytesTotal: number;
};

type ProxiesResponse = {
  // ex-overview
  invoices: number;
  currency: string;
  activeSubscription: null | {
    nbSubs: number;
    nextInvoiceAt: string | null;
  };
  proxiesInUse: {
    active: number;
    total: number | null;
  };
  bandwidth: {
    points: BandwidthPoint[];
  };

  // ex-proxies
  proxies: ApiProxy[];
  bandwidthByProxy: Record<number, BandwidthPoint[]>;
};


function ManageMonthlySpentSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Monthly Spent</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <p className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function ActiveSubscriptionSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Active Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
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
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-9 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
/* ============================
 * PAGE
 * ============================ */

function MonthlySpentCard(props: {
  amount: DashboardOverview['invoices'];
  currency: DashboardOverview['currency'];
}) {
  const rawAmount = props.amount;
  const rawCurrency = props.currency;

  const amount =
    typeof rawAmount === 'number' && !Number.isNaN(rawAmount)
      ? rawAmount
      : 0;

  const currency = rawCurrency || 'USD';

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Monthly Spent</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">
          {amount.toFixed(2)} {currency}
        </p>
        <p className="text-sm text-muted-foreground justify-baseline">
          Total billed for the current billing period.
        </p>
      </CardContent>
    </Card>
  );
}


function ActiveSubscriptionCard(props: {
  subscription: DashboardOverview['activeSubscription'];
}) {
  const { subscription } = props;
  const router = useRouter();

  if (!subscription) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Active Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">No active subscription.</p>
          <p className="text-sm text-muted-foreground">
            You can start a new subscription from the pricing page.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            className='my-1 flex justify-start shadow-none rounded-2xl text-sm'
            size="sm"
            variant="outline"
            onClick={() => router.push('/dashboard/proxies')}
          >
            Subscribe 🚀
          </Button>
      </CardFooter>
      </Card>
    );
  }

  const nextInvoiceText = subscription.nextInvoiceAt
    ? new Date(subscription.nextInvoiceAt).toLocaleDateString()
    : 'N/A';
  const nbSubs = subscription.nbSubs;

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className='text-xl'>Active Subscriptions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Your next invoice is on {nextInvoiceText}.
        </p>
          <Button
            className='my-1 flex justify-start shadow-none rounded-2xl text-md'
            size="lg"
            onClick={() => router.push('/dashboard/proxies')}
          >
            Manage Subscriptions
          </Button>
      </CardContent>
    </Card>
  );
}

function NeedHelpCard() {
  const router = useRouter();
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Need Help?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Open a ticket from the support center or email us at
          {' '}
          support@ionproxy.com.
        </p>
      </CardContent>
      <CardFooter className="mt-4 flex items-center justify-between">
        {/* Bouton bas gauche */}
        <Button
          className='my-1 flex justify-start shadow-none rounded-2xl text-sm'
          size="sm"
          variant="outline"
          onClick={() => router.push('/dashboard/help')}
        >
          Go to support
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ProxiesPage() {
  type SubTypeFilter = "both" | "sub" | "pass";
  type NetworkFilter = "all" | "4G" | "5G";


  const [subType, setSubType] = React.useState<SubTypeFilter>("both");
  const [network, setNetwork] = React.useState<NetworkFilter>("all");
  const [country, setCountry] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");

  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());

  const [editOpen, setEditOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ApiProxy | null>(null);

  const [editUsername, setEditUsername] = React.useState("");
  const [editPassword, setEditPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<ApiProxy | null>(null);

  const [cancelling, setCancelling] = React.useState(false);

  async function cancelAllocation() {
    if (!cancelTarget) return;

    setCancelling(true);
    try {
      const res = await fetch(
        `/api/dashboard/proxies/${cancelTarget.allocationId}/cancel`,
        { method: "POST" } // ou DELETE/PATCH selon ton API
      );
      if (!res.ok) throw new Error("cancel failed");

      setCancelOpen(false);
      setCancelTarget(null);
      await mutate();
    } finally {
      setCancelling(false);
    }
  }


  React.useEffect(() => {
    if (!editTarget) return;

    // ⚠️ adapte selon ton API (idéalement username/password séparés)
    const creds = (editTarget as any).credentials as string | undefined; // ex: "user:pass"
    const [u, p] = creds?.split(":") ?? ["", ""];
    setEditUsername(u ?? "");
    setEditPassword(p ?? "");
  }, [editTarget]);

  async function saveCredentials() {
    if (!editTarget) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/proxies/${editTarget.allocationId}/credentials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          password: editPassword,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setEditOpen(false);
      setEditTarget(null);
      setEditUsername("");
      setEditPassword("");

      await mutate(); // refresh table
    } finally {
      setSaving(false);
    }
  }

  // Fetch proxies data
  const { data, error, isLoading, mutate } = useSWR<ProxiesResponse>(
    '/api/dashboard/proxies',
    apiFetcher
  );

  useDashboardAuthGuard(error);

  const isErrored = !!error;

  const proxies = data?.proxies ?? [];

  const countries = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of proxies) if (p.location) set.add(p.location);
    return ["all", ...Array.from(set).sort()];
  }, [proxies]);

  const filtered = React.useMemo(() => {
    return proxies.filter((p) => {
      // NOTE: à adapter selon tes vrais champs
      const pSubType = (p as any).subType as "sub" | "pass" | undefined;     // TODO API
      const pNetwork = (p as any).networkType as "4G" | "5G" | undefined;   // TODO API

      if (subType !== "both" && pSubType !== subType) return false;
      if (network !== "all" && pNetwork !== network) return false;
      if (country !== "all" && (p.location ?? "Unknown") !== country) return false;

      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = [
          p.label ?? "",
          p.ipAddress,
          String(p.port),
          p.location ?? "",
          p.isp ?? "",
        ].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }

      return true;
    });
  }, [proxies, subType, network, country, search]);

  const allChecked = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.allocationId));
  const someChecked = filtered.some((p) => selectedIds.has(p.allocationId)) && !allChecked;

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        for (const p of filtered) next.delete(p.allocationId);
      } else {
        for (const p of filtered) next.add(p.allocationId);
      }
      return next;
    });
  }

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      toast.success("Copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy");
    });
  }

  function copyAllToClipboard(rows: ApiProxy[]) {
    const lines = rows
      .map((p) => {
        const user = (p as any).username ?? "";
        const pass = (p as any).password ?? "";
        return `${p.ipAddress}:${p.port}:${user}:${pass}`;
      })
      .filter((l) => l !== ":::"); // optionnel si tu veux éviter les vides

    const payload = lines.join("\n");

    navigator.clipboard
      .writeText(payload)
      .then(() => toast.success("Copied selected proxies to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  }


  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    
    <section className="flex-1 p-4 lg:p-8">
      {isLoading && !data && (
        <>
          <ManageMonthlySpentSkeleton />
          <ActiveSubscriptionSkeleton />
          <NeedHelpSkeleton />
        </>
      )}
      {isErrored && (
        <>
          <p className="mb-4 text-sm text-red-500">
            Failed to load dashboard data. Please try again later.
          </p>
          <ManageMonthlySpentSkeleton />
          <ActiveSubscriptionSkeleton />
          <NeedHelpSkeleton />
        </>
      )}

      {!isLoading && data && (
        <div className="flex flex-col gap-6 w-full">
          {/* Groupe du haut : 3 colonnes, même hauteur */}
          <div className="grid w-full gap-6 md:grid-cols-3">
            <MonthlySpentCard
              amount={data.invoices}
              currency={data.currency}
            />
            <ActiveSubscriptionCard
              subscription={data.activeSubscription}
            />
            <NeedHelpCard />
          </div>
        </div>
      )}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>My Proxies</CardTitle>
              <CardDescription>Manage, filter and edit your allocated proxies.</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl shadow-none"
                onClick={() => mutate()}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              <Button size="sm" className="rounded-2xl">
                Add Proxy
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {/* LOADING / ERROR / EMPTY */}
          {isLoading && !data && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading proxies...
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500">
              Failed to load your proxies. Please try again later.
            </div>
          )}

          {!isLoading && !error && proxies.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No proxies allocated yet.
            </div>
          )}

          {/* TOOLBAR */}
          {!isLoading && !error && proxies.length > 0 && (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Sub / Pass / Both */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={subType} onValueChange={(v) => setSubType(v as any)}>
                    <SelectTrigger className="w-[160px] rounded-2xl">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="both">Subs + Pass</SelectItem>
                      <SelectItem value="sub">Subs only</SelectItem>
                      <SelectItem value="pass">Pass only</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 4G / 5G */}
                  <Select value={network} onValueChange={(v) => setNetwork(v as any)}>
                    <SelectTrigger className="w-[140px] rounded-2xl">
                      <SelectValue placeholder="Network" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="4G">4G</SelectItem>
                      <SelectItem value="5G">5G</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Country */}
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-[200px] rounded-2xl">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c === "all" ? "All countries" : c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    disabled={selectedIds.size === 0}
                    onClick={() => {
                      // TODO: ouvrir modal bulk edit avec selectedIds
                      console.log("Bulk edit", Array.from(selectedIds));
                    }}
                  >
                    Bulk edit ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    disabled={selectedIds.size === 0}
                    onClick={() => {
                              const selectedRows = filtered.filter((p) => selectedIds.has(p.allocationId));
                              copyAllToClipboard(selectedRows);
                            }}
                  >
                    Copy infos ({selectedIds.size})
                  </Button>
                </div>
              </div>

              {/* TABLE */}
              <div className="rounded-2xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={allChecked ? true : someChecked ? "indeterminate" : false}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>User:Pass</TableHead>
                      <TableHead>Copy Infos</TableHead>
                      <TableHead>Rotate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Edit</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((p) => {
                      const checked = selectedIds.has(p.allocationId);

                      // NOTE: à adapter selon tes vrais champs API
                      const rawUsername = (p as any).username;
                      const rawPassword = (p as any).password;

                      const username = typeof rawUsername === "string" ? rawUsername : "—";
                      const password = typeof rawPassword === "string" ? rawPassword : "—";
                      const type = (p as any).subType ?? "—";      // "sub" | "pass"

                      return (
                        <TableRow key={p.allocationId} data-state={checked ? "selected" : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleOne(p.allocationId)}
                              aria-label={`Select ${p.allocationId}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge className='bg-transparent'>
                              <span className="flex items-center gap-1">
                                <span className="h-3 w-3 rounded-full bg-green-500 inline-block" />
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.location ?? "Unknown"}
                          </TableCell>

                          <TableCell className="group font-mono text-sm cursor-pointer select-none rounded-md transition"
                                        onClick={() => copyToClipboard(`${username}:${password}`)}
                                        title="Click to copy">
                            {p.ipAddress}:{p.port} <Copy className="ml-1 inline h-3 w-3 opacity-60 hover:opacity-100" />
                          </TableCell>

                          <TableCell    className="group font-mono text-sm cursor-pointer select-none rounded-md transition"
                                        onClick={() => copyToClipboard(`${username}:${password}`)}
                                        title="Click to copy">
                            {username}:{password} <Copy className="ml-1 inline h-3 w-3 opacity-60 hover:opacity-100" />
                          </TableCell>
                          <TableCell    className="group font-mono text-sm cursor-pointer select-none rounded-md transition"
                                        title="Click to copy">
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-2xl"
                                    aria-label="Actions"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>

                                <TooltipContent side="bottom" className="rounded-2xl p-3 w-44
                                                                        bg-background/40 backdrop-blur-md
                                                                        border border-border/50 shadow-xl
                                                                        flex flex-col gap-2
                                                                        [&_[data-popper-arrow]]:hidden">
                                  <div className="flex flex-col gap-2 w-40">
                                    <Button
                                      size="sm"
                                      className="rounded-xl h-8"
                                      onClick={() => copyToClipboard(`${p.ipAddress}:${p.port}:${username}:${password}`)}
                                    >
                                      ip:port:user:pass
                                    </Button>

                                    <Button
                                      size="sm"
                                      className="rounded-xl h-8"
                                      onClick={() => copyToClipboard(`${username}:${password}@${p.ipAddress}:${p.port}`)}
                                    >
                                      user:pass@ip:port
                                    </Button>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                          </TableCell>
                          <TableCell className="justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-2xl"
                              onClick={async () => {
                                try {
                                  // adapte l’endpoint si besoin
                                  const res = await fetch(
                                    `/api/dashboard/proxies/${p.allocationId}/rotate`,
                                    { method: "POST" }
                                  );
                                  if (!res.ok) throw new Error("rotate failed");
                                  await mutate(); // refresh table
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              aria-label="Rotate proxy"
                              title="Rotate proxy"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-xl">
                              {type}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center">
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-2xl"
                                    aria-label="Actions"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>

                                <TooltipContent side="bottom" className="rounded-2xl p-3 w-44
                                                                        bg-background/40 backdrop-blur-md
                                                                        border border-border/50 shadow-xl
                                                                        flex flex-col gap-2
                                                                        [&_[data-popper-arrow]]:hidden">
                                  <div className="flex flex-col gap-2 w-40">
                                    <Button
                                      size="sm"
                                      className="rounded-xl h-8"
                                      onClick={() => {
                                        // EDIT : comportement identique à avant
                                        setEditTarget(p);
                                        setEditOpen(true);
                                      }}
                                    >
                                      Edit
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="rounded-xl h-8"
                                      onClick={() => {
                                        setCancelTarget(p);
                                        setCancelOpen(true);
                                      }}
                                    >
                                      <X className="mr-2 h-4 w-4" />
                                      Cancel
                                    </Button>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Dialog
                open={editOpen}
                onOpenChange={(open) => {
                  setEditOpen(open);
                  if (!open) setEditTarget(null);
                }}
              >
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit proxy credentials</DialogTitle>
                    <DialogDescription>
                      Update username and password for this proxy.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="proxy-username">Username</Label>
                      <Input
                        id="proxy-username"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="rounded-2xl"
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="proxy-password">Password</Label>
                      <Input
                        id="proxy-password"
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="rounded-2xl"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-4">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setEditOpen(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>

                    <Button
                      className="rounded-2xl"
                      onClick={saveCredentials}
                      disabled={saving || !editUsername || !editPassword}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog
                open={cancelOpen}
                onOpenChange={(open) => {
                  setCancelOpen(open);
                  if (!open) setCancelTarget(null);
                }}
              >
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Cancel this proxy?</DialogTitle>
                    <DialogDescription>
                      This will cancel the allocation for{" "}
                      {cancelTarget
                        ? (cancelTarget.label ?? `${cancelTarget.ipAddress}:${cancelTarget.port}`)
                        : "this proxy"}
                      . This action may be irreversible.
                      Your proxy will remain available until the end of the month.
                    </DialogDescription>
                  </DialogHeader>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setCancelOpen(false)}
                      disabled={cancelling}
                    >
                      No, keep it
                    </Button>

                    <Button
                      variant="destructive"
                      className="rounded-2xl"
                      onClick={cancelAllocation}
                      disabled={cancelling}
                    >
                      {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Yes, cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No results for current filters.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );

}
