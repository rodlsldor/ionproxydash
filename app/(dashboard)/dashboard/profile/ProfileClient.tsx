'use client';

import { useActionState } from 'react';
import useSWR from 'swr';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

import {
  updateAccount,
  updatePassword,
  deleteAccount,
} from '@/lib/auth/actions';

import { apiFetcher } from '@/lib/api/fetcher';
import { useDashboardAuthGuard } from '@/lib/hooks/useDashboardAuthGuard';


type AccountState = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryOfResidence?: string;
  language?: string;
  timezone?: string;
  email?: string;
  error?: string;
  success?: string;
};

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  error?: string;
  success?: string;
};

const initialAccountState: AccountState = {};
const initialPasswordState: PasswordState = {};
const initialDeleteState: DeleteState = {};

type ProfileResponse = {
  user: {
    id: number;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    countryOfResidence: string | null;
    language: string | null;
    timezone: string | null;
    avatarUrl?: string | null;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  kyc: {
    status: 'none' | 'pending' | 'waiting' | 'verified' | 'rejected';
    level: string | null;
    lastUpdatedAt: string | null;
    manualReviewRequired: boolean;
  };
  latestIdentityVerification: any | null;
};

/* =======================
 * KYC BADGE
 * ======================= */

function KycBadge({ status, level }: { status: ProfileResponse['kyc']['status']; level: string | null }) {
  let label = 'KYC pending';
  let className = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700';

  if (status === 'verified') {
    label = level ? `KYC verified (${level})` : 'KYC verified';
    className = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700';
  } else if (status === 'rejected') {
    label = 'KYC rejected';
    className = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700';
  } else if (status === 'waiting') {
    label = 'KYC under review';
    className = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700';
  } else if (status === 'none') {
    label = 'KYC not started';
    className = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600';
  }

  return <span className={className}>{label}</span>;
}

/* =======================
 * PROFILE PAGE
 * ======================= */

export default function ProfilePage() {
  const { data, error, isLoading } = useSWR<ProfileResponse>(
    '/api/dashboard/profile',
    apiFetcher
  );

  useDashboardAuthGuard(error);
  
  const [accountState, accountAction] = useActionState<AccountState, FormData>(
    updateAccount as unknown as (
      state: AccountState,
      payload: FormData
    ) => Promise<AccountState>,
    initialAccountState
  );

  const [passwordState, passwordAction] = useActionState<PasswordState, FormData>(
    updatePassword as unknown as (
      state: PasswordState,
      payload: FormData
    ) => Promise<PasswordState>,
    initialPasswordState
  );

  const [deleteState, deleteAction] = useActionState<DeleteState, FormData>(
    deleteAccount as unknown as (
      state: DeleteState,
      payload: FormData
    ) => Promise<DeleteState>,
    initialDeleteState
  );

  const user = data?.user;
  const kyc = data?.kyc;

  return (
    <section className="flex-1 p-4 lg:p-8 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="h-14 w-14 overflow-hidden rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name ?? user.email}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>
                {(user?.firstName?.[0] ?? user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
              </span>
            )}
          </div>

          {/* Name + email + KYC */}
          <div className="space-y-1">
            <h1 className="text-lg font-semibold lg:text-2xl">
              {user?.name || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Profile'}
            </h1>
            {user && (
              <p className="text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
            {kyc && (
              <div className="pt-1">
                <KycBadge status={kyc.status} level={kyc.level} />
              </div>
            )}
          </div>
        </div>

        {/* Etat de chargement / erreur */}
        <div className="text-right text-xs text-muted-foreground">
          {isLoading && <span>Loading profile…</span>}
          {error && <span className="text-red-500">Error loading profile</span>}
        </div>
      </header>

      {/* ================== */}
      {/* Account details    */}
      {/* ================== */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={accountAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">First name</label>
                <Input
                  name="firstName"
                  placeholder="Your first name"
                  defaultValue={
                    accountState.firstName ??
                    user?.firstName ??
                    ''
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Last name</label>
                <Input
                  name="lastName"
                  placeholder="Your last name"
                  defaultValue={
                    accountState.lastName ??
                    user?.lastName ??
                    ''
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Display name</label>
              <Input
                name="name"
                placeholder="How you want to appear"
                defaultValue={
                  accountState.name ??
                  user?.name ??
                  ''
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                name="email"
                placeholder="you@example.com"
                defaultValue={
                  accountState.email ??
                  user?.email ??
                  ''
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  name="phone"
                  placeholder="+33 6 12 34 56 78"
                  defaultValue={
                    accountState.phone ??
                    user?.phone ??
                    ''
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Country</label>
                <Input
                  name="countryOfResidence"
                  placeholder="FR"
                  defaultValue={
                    accountState.countryOfResidence ??
                    user?.countryOfResidence ??
                    ''
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Timezone</label>
                <Input
                  name="timezone"
                  placeholder="Europe/Paris"
                  defaultValue={
                    accountState.timezone ??
                    user?.timezone ??
                    ''
                  }
                />
              </div>
            </div>

            {accountState.error && (
              <p className="text-sm text-red-500">
                {accountState.error}
              </p>
            )}

            {accountState.success && (
              <p className="text-sm text-emerald-500">
                {accountState.success}
              </p>
            )}

            <CardFooter className="px-0 pt-2">
              <Button type="submit" size="sm">
                Save changes
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>

      {/* ================== */}
      {/* Password change    */}
      {/* ================== */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Current password
              </label>
              <Input
                type="password"
                name="currentPassword"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                New password
              </label>
              <Input
                type="password"
                name="newPassword"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Confirm new password
              </label>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
              />
            </div>

            {passwordState.error && (
              <p className="text-sm text-red-500">
                {passwordState.error}
              </p>
            )}

            {passwordState.success && (
              <p className="text-sm text-emerald-500">
                {passwordState.success}
              </p>
            )}

            <CardFooter className="px-0 pt-2">
              <Button type="submit" size="sm">
                Update password
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>

      {/* ================== */}
      {/* Danger zone        */}
      {/* ================== */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Deleting your account is permanent. All your data and
            active sessions will be removed.
          </p>

          <form action={deleteAction} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Confirm with your password
              </label>
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
              />
            </div>

            {deleteState.error && (
              <p className="text-sm text-red-500">
                {deleteState.error}
              </p>
            )}

            {deleteState.success && (
              <p className="text-sm text-emerald-500">
                {deleteState.success}
              </p>
            )}

            <CardFooter className="px-0 pt-2 flex justify-between">
              <Button
                type="submit"
                variant="destructive"
                size="sm"
              >
                Delete my account
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
