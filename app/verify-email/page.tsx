import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/AuthPage';
import { safeRedirectPath } from '@/lib/redirect';

export const metadata: Metadata = { title: 'Verify email', robots: { index: false, follow: false } };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      mode="verify-email"
      email={params.email}
      redirectPath={safeRedirectPath(params.redirect) ?? undefined}
    />
  );
}
