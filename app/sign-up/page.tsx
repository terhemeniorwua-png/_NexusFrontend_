import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/AuthPage';
import { safeRedirectPath } from '@/lib/redirect';

export const metadata: Metadata = { title: 'Create account', robots: { index: false, follow: false } };
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <AuthPage mode="sign-up" redirectPath={safeRedirectPath(redirect) ?? undefined} />;
}
