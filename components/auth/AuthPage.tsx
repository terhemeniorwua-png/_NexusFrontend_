import { AuthForm } from './AuthForm';

export function AuthPage({ mode, token, email }: { mode: 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password' | 'verify-email'; token?: string; email?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4 py-10">
      <AuthForm mode={mode} initialToken={token} initialEmail={email} />
    </main>
  );
}
