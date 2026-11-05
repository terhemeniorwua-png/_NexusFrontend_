import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/AuthPage';
import { safeRedirectPath } from '@/lib/redirect';
import type { AuthAccountType } from '@/types/auth';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ accountType?: string; redirect?: string; deletionScheduledAt?: string }>;
}) {
  const { accountType, redirect, deletionScheduledAt } = await searchParams;
  const validAccountType: AuthAccountType | undefined = accountType === 'personal' || accountType === 'institution' || accountType === 'business' ? accountType : undefined;
  return (
    <AuthPage
      mode="sign-in"
      initialAccountType={validAccountType}
      redirectPath={safeRedirectPath(redirect) ?? undefined}
      deletionScheduledAt={deletionScheduledAt}
    />
  );
}
