'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getAccessToken, ApiRequestError, apiRequest } from '@/lib/api';
import { refreshSession, signOut, type AuthUser } from '@/services/auth';

export default function AppHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        if (!getAccessToken()) await refreshSession();
        let result: { user: AuthUser };
        try {
          result = await apiRequest<{ user: AuthUser }>('/auth/me', { authenticated: true });
        } catch (cause) {
          if (!(cause instanceof ApiRequestError) || cause.status !== 401) throw cause;
          await refreshSession();
          result = await apiRequest<{ user: AuthUser }>('/auth/me', { authenticated: true });
        }
        if (active) setUser(result.user);
      } catch (cause) {
        if (active && cause instanceof ApiRequestError && cause.status === 401) {
          setError('Your session has expired. Redirecting to sign in…');
          router.replace('/sign-in');
        } else if (active) {
          setError(cause instanceof ApiRequestError ? cause.message : 'Your session could not be verified.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadSession();
    return () => { active = false; };
  }, [router]);

  async function handleSignOut() {
    try {
      await signOut();
      router.push('/');
    } catch (cause) {
      setUser(null);
      setError(cause instanceof ApiRequestError ? cause.message : 'Sign out could not be confirmed. Please try again.');
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2 font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">N</span>Nexus</Link>{user && <Button variant="secondary" onClick={handleSignOut}>Sign out</Button>}</header>
      <section className="my-auto py-16">
        {loading ? <p role="status" className="text-sm text-[var(--color-text-secondary)]">Checking your session…</p> : error ? <div className="mx-auto max-w-lg"><Alert variant="error" title="We couldn’t open your workspace">{error}</Alert><div className="mt-5 flex gap-3"><Button onClick={() => window.location.reload()}>Try again</Button><Link className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]" href="/sign-in">Sign in</Link></div></div> : user ? <Card className="mx-auto max-w-2xl p-8 sm:p-10"><p className="text-sm font-medium text-[var(--color-primary)]">You’re signed in</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome, {user.name}.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">Add a few details to personalize your Nexus account.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/app/profile" className="inline-flex h-9 items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">Set up your profile</Link><Button variant="secondary" onClick={handleSignOut}>Sign out</Button></div></Card> : null}
      </section>
      <footer className="text-xs text-[var(--color-text-muted)]">Nexus · One connected workspace for projects, people, and progress.</footer>
    </main>
  );
}
