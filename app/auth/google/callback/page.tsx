import type { Metadata } from 'next';
import { GoogleOAuthCallback } from '@/components/auth/GoogleOAuthCallback';

export const metadata: Metadata = {
  title: 'Continue with Google',
  robots: { index: false, follow: false },
};

export default async function GoogleOAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;
  return <GoogleOAuthCallback code={params.code} error={params.error} />;
}
