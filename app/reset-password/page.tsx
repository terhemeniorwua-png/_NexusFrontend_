import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/AuthPage';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const params = await searchParams;
  return <AuthPage mode="reset-password" email={params.email} />;
}
