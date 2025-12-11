'use client';

import * as React from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Wifi, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// Chart
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  proxies: ApiProxy[];
  bandwidthByProxy: Record<number, BandwidthPoint[]>;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString();
}

function statusColor(status: ApiProxy['status']) {
  switch (status) {
    case 'allocated':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'available':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    case 'maintenance':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'disabled':
    default:
      return 'bg-red-500/10 text-red-400 border-red-500/30';
  }
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/* ============================
 * CHART CONFIG
 * ============================ */

const chartConfig = {
  bandwidth: {
    label: 'Bandwidth',
  },
  download: {
    label: 'Download',
    color: 'hsl(0 0% 92%)',
  },
  upload: {
    label: 'Upload',
    color: 'hsl(0 0% 65%)',
  },
} satisfies ChartConfig;

function ProxyBandwidthChart({ points }: { points: BandwidthPoint[] }) {
  const [timeRange, setTimeRange] = React.useState<'90d' | '30d' | '7d'>('90d');

  const chartData = React.useMemo(
    () =>
      (points ?? []).map((p) => ({
        date: p.bucket,
        download: p.bytesIn,
        upload: p.bytesOut,
      })),
    [points]
  );

  const filteredData = React.useMemo(() => {
    if (!chartData.length) return [];

    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === '30d') daysToSubtract = 30;
    if (timeRange === '7d') daysToSubtract = 7;

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return chartData.filter((item) => {
      const d = new Date(item.date);
      return d >= startDate;
    });
  }, [chartData, timeRange]);

  return (
    <Card className="mb-6 pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Bandwidth usage</CardTitle>
          <CardDescription>
            Upload & download for the selected proxy over the chosen period.
          </CardDescription>
        </div>

        <Select
          value={timeRange}
          onValueChange={(value) =>
            setTimeRange(value as '90d' | '30d' | '7d')
          }
        >
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDownload" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-download)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-download)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillUpload" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-upload)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-upload)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                  formatter={(value, name) => {
                    const label =
                      name === 'download' ? 'Download' : 'Upload';
                    return [label, formatBytes(Number(value))];
                  }}
                  indicator="dot"
                />
              }
            />

            <Area
              dataKey="download"
              type="natural"
              fill="url(#fillDownload)"
              stroke="var(--color-download)"
              stackId="a"
            />
            <Area
              dataKey="upload"
              type="natural"
              fill="url(#fillUpload)"
              stroke="var(--color-upload)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ============================
 * PAGE
 * ============================ */

export default function ProxiesPage() {
  const { data, error, isLoading, mutate } = useSWR<ProxiesResponse>(
    '/api/dashboard/proxies',
    fetcher
  );

  const proxies = data?.proxies ?? [];
  const bandwidthByProxy = data?.bandwidthByProxy ?? {};

  // proxy sélectionné pour le chart
  const [selectedProxyId, setSelectedProxyId] = React.useState<number | null>(
    proxies.length > 0 ? proxies[0].proxyId : null
  );

  React.useEffect(() => {
    if (!proxies.length) {
      setSelectedProxyId(null);
      return;
    }
    // si le proxy sélectionné n'existe plus (changement de data) → on prend le 1er
    if (!selectedProxyId || !proxies.some(p => p.proxyId === selectedProxyId)) {
      setSelectedProxyId(proxies[0].proxyId);
    }
  }, [proxies, selectedProxyId]);

  const selectedProxy =
    selectedProxyId != null
      ? proxies.find((p) => p.proxyId === selectedProxyId) ?? null
      : null;

  const selectedPoints =
    selectedProxyId != null ? bandwidthByProxy[selectedProxyId] ?? [] : [];

  return (
    <section className="flex-1 p-4 lg:p-8">
      {/* Titre + refresh global */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-lg font-medium lg:text-2xl">My Proxies</h1>
        <Button
          variant="outline"
          size="sm"
          className="rounded-2xl shadow-none text-sm"
          onClick={() => mutate()}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* LOADING / ERROR / EMPTY */}
      {isLoading && !data && (
        <Card>
          <CardHeader>
            <CardTitle>Loading your proxies...</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching allocated proxies for your account.
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Failed to load your proxies. Please try again later.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && proxies.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No proxies allocated yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You don&apos;t have any active proxies assigned to your account.
            Start a subscription or contact support if you think this is an
            error.
          </CardContent>
        </Card>
      )}

      {/* CONTENU QUAND ON A DES PROXYS */}
      {!isLoading && !error && proxies.length > 0 && (
        <>
          {/* ====== CARD BANDWIDTH PAR PROXY ====== */}
          <Card className="mb-6">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>
                    Bandwidth per proxy
                    {selectedProxy &&
                      ` – ${
                        selectedProxy.label ??
                        `${selectedProxy.ipAddress}:${selectedProxy.port}`
                      }`}
                  </CardTitle>
                  <CardDescription>
                    Select a proxy below to inspect its bandwidth usage.
                  </CardDescription>
                </div>

                {/* Carousel de sélection de proxy */}
                <Carousel
                  opts={{
                    align: 'start',
                    dragFree: true,
                  }}
                  className="w-full max-w-xl"
                >
                  <CarouselContent>
                    {proxies.map((proxy) => {
                      const active = proxy.proxyId === selectedProxyId;
                      return (
                        <CarouselItem
                          key={proxy.proxyId}
                          className="basis-1/2 sm:basis-1/3 lg:basis-1/4"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedProxyId(proxy.proxyId)}
                            className={cn(
                              'w-full rounded-2xl border px-3 py-2 text-left text-xs sm:text-sm transition',
                              'bg-background/50 hover:bg-muted',
                              active &&
                                'border-emerald-500/60 bg-emerald-500/5 text-emerald-200'
                            )}
                          >
                            <div className="font-medium truncate">
                              {proxy.label ?? `Proxy #${proxy.proxyId}`}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {proxy.ipAddress}:{proxy.port}
                            </div>
                          </button>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <div className="mt-4 flex justify-center gap-4">
                    <CarouselPrevious className="relative left-0 top-0 translate-y-0" />
                    <CarouselNext className="relative right-0 top-0 translate-y-0" />
                  </div>
                </Carousel>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <ProxyBandwidthChart points={selectedPoints} />
            </CardContent>
          </Card>

          {/* ====== CAROUSEL DES CARDS PROXYS ====== */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Allocated proxies</CardTitle>
            </CardHeader>

            <CardContent className="pt-0">
              <Carousel
                opts={{
                  align: 'start',
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {proxies.map((proxy) => (
                    <CarouselItem
                      key={proxy.allocationId}
                      className="basis-full md:basis-1/2 xl:basis-1/4"
                    >
                      <Card className="flex h-full flex-col justify-between">
                        <CardHeader className="space-y-2 pb-3">
                          <div className="flex items-center justify_between gap-2">
                            <CardTitle className="text-base">
                              {proxy.label ?? `Proxy #${proxy.proxyId}`}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className={cn(
                                'border px-2 py-0.5 text-xs',
                                statusColor(proxy.status)
                              )}
                            >
                              {proxy.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {proxy.ipAddress}:{proxy.port}
                          </p>
                        </CardHeader>

                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {proxy.location ?? 'Unknown location'}
                              {proxy.isp ? ` • ${proxy.isp}` : ''}
                            </span>
                          </div>

                          {proxy.dongleId && (
                            <div className="flex items-center gap-2">
                              <Wifi className="h-4 w-4" />
                              <span>Dongle ID: {proxy.dongleId}</span>
                            </div>
                          )}

                          <div className="space-y-1">
                            <p>
                              <span className="font-medium text-foreground">
                                Allocated since:
                              </span>{' '}
                              {formatDate(proxy.startsAt)}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">
                                Last health check:
                              </span>{' '}
                              {formatDate(proxy.lastHealthCheck)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <CarouselPrevious className="-left-16 top-1/2 -translate-y-1/2" />
                <CarouselNext className="-right-16 top-1/2 -translate-y-1/2" />
              </Carousel>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
