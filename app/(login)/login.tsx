'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { signIn as signInNextAuth } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

import { signUp } from '@/lib/auth/actions';
import { ActionState } from '@/lib/auth/action-helpers';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');

  // State pour SIGN IN (Auth.js Credentials)
  const [signInError, setSignInError] = useState<string | undefined>(undefined);
  const [signInPending, setSignInPending] = useState(false);

  // State pour SIGN UP (server action existante)
  const [state, formAction, pendingSignUp] =
    useActionState<ActionState, FormData>(signUp, { error: '' });

  const error = mode === 'signin' ? signInError : state?.error;
  const pending = mode === 'signin' ? signInPending : pendingSignUp;

  async function handleSignInSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (mode !== 'signin') return;
    e.preventDefault();

    setSignInError(undefined);
    setSignInPending(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const callbackUrl =
      redirect && redirect !== '' ? redirect : '/dashboard';

    const res = await signInNextAuth('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (res?.error) {
      setSignInError('Invalid email or password. Please try again.');
      setSignInPending(false);
      return;
    }

    if (res?.ok && res.url) {
      window.location.href = res.url;
      return;
    }

    setSignInPending(false);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      {/* Logo + titre */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/images/Logo-Ion-Proxy.png"
            alt="Ion Proxy Logo"
            width={150}
            height={50}
            priority
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold">
          {mode === 'signin'
            ? 'Sign in to your account'
            : 'Create your account'}
        </h2>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-lg">
          <form
            className="space-y-6"
            action={mode === 'signup' ? formAction : undefined}
            onSubmit={mode === 'signin' ? handleSignInSubmit : undefined}
          >
            <input type="hidden" name="redirect" value={redirect || ''} />
            <input type="hidden" name="priceId" value={priceId || ''} />
            <input type="hidden" name="inviteId" value={inviteId || ''} />

            {/* Champs supplémentaires uniquement en signup */}
            {mode === 'signup' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="fullName" className="mb-1 block font-medium">
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="mb-1 block font-medium">
                    Company / Team (optional)
                  </Label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    maxLength={80}
                    placeholder="Acme Growth"
                  />
                </div>
                <div>
                  <Label htmlFor="useCase" className="mb-1 block font-medium">
                    Main use case
                  </Label>
                  <select
                    id="useCase"
                    name="useCase"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    <option value="growth">Growth / Lead gen</option>
                    <option value="outreach">Outreach / Cold email</option>
                    <option value="scraping">Scraping / Data</option>
                    <option value="ads">Ads verification</option>
                    <option value="social">Social media</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <Label htmlFor="email" className="mb-1 block font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={mode === 'signup' ? (state as any).email : ''}
                required
                maxLength={50}
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="mb-1 block font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                defaultValue={mode === 'signup' ? (state as any).password : ''}
                required
                minLength={8}
                maxLength={100}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                'Sign up'
              )}
            </Button>
          </form>

          {/* Signup: divider + Google */}
          {mode === 'signup' && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card/80 px-2 text-muted-foreground">
                    or continue with
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex w-full items-center justify-center gap-2 rounded-full"
                  onClick={() =>
                    signInNextAuth('google', {
                      callbackUrl:
                        redirect && redirect !== ''
                          ? redirect
                          : '/dashboard',
                    })
                  }
                >
                  <Image
                    src="/images/google-icon.svg"
                    alt="Google"
                    width={18}
                    height={18}
                  />
                  <span className="text-sm font-medium">
                    Continue with Google
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Switch signin/signup */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">
                {mode === 'signin'
                  ? 'New to our platform?'
                  : 'Already have an account?'}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                redirect ? `?redirect=${redirect}` : ''
              }${priceId ? `${redirect ? '&' : '?'}priceId=${priceId}` : ''}`}
              className="block w-full rounded-full border border-border bg-card py-2 px-4 text-center text-sm font-medium hover:bg-muted"
            >
              {mode === 'signin'
                ? 'Create an account'
                : 'Sign in to existing account'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
