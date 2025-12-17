'use client';

import * as React from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// === IMPORTS DU CHART ===
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
import { apiFetcher } from '@/lib/api/fetcher';
import { useDashboardAuthGuard } from '@/lib/hooks/useDashboardAuthGuard';


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



/* ----------------------------------------
 * SKELETONS
 * ----------------------------------------*/

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

function ProxiesUsageSkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Proxies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-52 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}


const chartConfig = {
  bandwidth: {
    label: "Bandwidth",
  },
  download: {
    label: "Download",
    // gris clair (ligne quasi blanche)
    color: "hsl(0 0% 92%)",
  },
  upload: {
    label: "Upload",
    // gris un peu plus foncé
    color: "hsl(0 0% 65%)",
  },
} satisfies ChartConfig;

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}


function ChartAreaInteractive(props: {
  points: DashboardOverview['bandwidth']['points'] | undefined;
}) {
  const { points } = props;
  const [timeRange, setTimeRange] = React.useState<'90d' | '30d' | '7d'>('90d');

  // On transforme les points en data pour Recharts
  const chartData = React.useMemo(
    () =>
      (points ?? []).map((p) => ({
        date: p.bucket,         // string ISO → utilisé pour l’axe X
        download: p.bytesIn,    // bytesIn = download
        upload: p.bytesOut,     // bytesOut = upload
      })),
    [points]
  );

  const filteredData = React.useMemo(() => {
    if (!chartData.length) return [];

    const referenceDate = new Date(); // maintenant
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
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Bandwidth (all proxies)</CardTitle>
          <CardDescription>
            Total upload & download over the selected period.
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as '90d' | '30d' | '7d')}>
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
                labelFormatter={(value) => {
                  return new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
                formatter={(value, name) => {
                  const label = name === 'download' ? 'Download' : 'Upload';
                  return [label, ` ${formatBytes(Number(value))}`];
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


/* ----------------------------------------
 * CARDS
 * ----------------------------------------*/

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
          <CardTitle>Active Subscriptions</CardTitle>
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

function ProxiesInUseCard(props: {
  proxies?:
    | {
        active: number;
        total: number | null;
      }
    | undefined;
}) {
  
  const router = useRouter();
  const proxies = props.proxies;

  const active =
    typeof proxies?.active === 'number' ? proxies.active : 0;

  const total =
    typeof proxies?.total === 'number' ? proxies.total : null;

  const label =
    total && total > 0
      ? `${active} / ${total}`
      : `${active}`;

  return (
    <Card className="mb-8">
      {/* HEADER : titre à gauche, "Active proxies" à droite */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className='text-xl'>Proxies</CardTitle>
        <span className="text-md font-medium text-muted-foreground">
          Active proxies: {active}
        </span>
      </CardHeader>

      {/* CONTENU CENTRAL */}
      <CardContent>
        <p className="text-md text-muted-foreground">
          Manage your active proxies effortlessly. You've got {label} proxies live. Control them here, rotate IPs, or add new ones as needed to keep your projects running smoothly.
        </p>
      </CardContent>

      {/* FOOTER : image en bas à gauche, bouton en bas à droite */}
      <CardFooter className="mt-4 flex items-center justify-between">
        {/* Image bas gauche */}
        <div className="relative h-10 w-10">
          <Image
            src="/images/Icon-Ion-Proxy.png"   // change le chemin ici
            alt="Proxies illustration"
            fill
            className="object-contain"
          />
        </div>

        {/* Bouton bas droite */}
        <Button
          className='my-1 flex justify-start shadow-none rounded-2xl text-md'
          size="lg"
          onClick={() => router.push('/dashboard/proxies')}
        >
          Manage proxies
        </Button>
      </CardFooter>
    </Card>
  );
}


/* ----------------------------------------
 * PAGE COMPONENT
 * ----------------------------------------*/

export default function DashboardOverviewClient() {
  const { data, error, isLoading } = useSWR<DashboardOverview>(
    '/api/dashboard/overview',
    apiFetcher
  );

  useDashboardAuthGuard(error);

  const isErrored = !!error;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium lg:text-2xl">
        Account & Billing
      </h1>

      {isLoading && !data && (
        <>
          <ManageMonthlySpentSkeleton />
          <ActiveSubscriptionSkeleton />
          <NeedHelpSkeleton />
          <ProxiesUsageSkeleton />
        </>
      )}

      {isErrored && (
        <>
          <p className="mb-4 text-sm text-red-500">
            Failed to load dashboard data. Showing placeholders.
          </p>
          <ManageMonthlySpentSkeleton />
          <ActiveSubscriptionSkeleton />
          <NeedHelpSkeleton />
          <ProxiesUsageSkeleton />
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

          {/* Graph full-width sous les 3 cards */}
          <ChartAreaInteractive points={data.bandwidth?.points}/>

          {/* Carte en dessous */}
          <ProxiesInUseCard proxies={data.proxiesInUse} />
        </div>
      )}
    </section>
  );
}