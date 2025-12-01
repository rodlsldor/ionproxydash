'use client';

import { useActionState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

import { Loader2 } from 'lucide-react';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/* -------------------- Skeletons -------------------- */

function MonthlySpent() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Monthly Spent</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">$120</p>
        <p className="text-sm text-muted-foreground">
          Estimated monthly spend based on your current usage.
        </p>
      </CardContent>
    </Card>
  );
}

function ActiveSubscription() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Active Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-medium">Ion Proxy – Pro Plan</p>
        <p className="text-sm text-muted-foreground">
          Billed monthly. Next invoice on 5th August.
        </p>
      </CardContent>
    </Card>
  );
}

function NeedHelp() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Need Help?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Open a ticket from the support center or email us at
          support@ionproxy.com.
        </p>
        <Button className="mt-4" variant="outline">
          Go to support
        </Button>
      </CardContent>
    </Card>
  );
}

function ProxiesInUse() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Proxies</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">3 / 10</p>
        <p className="text-sm text-muted-foreground">
          Active dedicated proxies in use.
        </p>
      </CardContent>
    </Card>
  );
}


/* -------------------- Helpers -------------------- */

// const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) =>
//   user.name || user.email || 'Unknown User';

// const getInitials = (user: Pick<User, 'id' | 'name' | 'email'>) =>
//   (getUserDisplayName(user)
//     .split(' ')
//     .filter(Boolean)
//     .map((n) => n[0])
//     .join('') || '?'
//   ).toUpperCase();

/* -------------------- Components -------------------- */

function ManageMonthlySpent() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Monthly Spent</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-20 animate-pulse rounded bg-muted" 

        />
      </CardContent>
    </Card>
  );
}

function ActiveSubs() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Active Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-40 animate-pulse rounded bg-muted">
          <p>Monitor and manage your 1 active subscriptions. Everything you need is just a click away.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function HelpCenter() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Need Help?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-40 animate-pulse rounded bg-muted">
          <p>Keep an eye on your support tickets. We're here to help whenever you need us.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProxiesUsage() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Proxies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-16 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}


/* -------------------- Page -------------------- */

export default function SettingsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium lg:text-2xl">Team Settings</h1>
      {/* <ManageSubscription />
      <TeamMembers />
      <InviteTeamMember /> */}
      <MonthlySpent />
      <ActiveSubscription />
      <NeedHelp />
      <ProxiesInUse />
    </section>
  );
}
