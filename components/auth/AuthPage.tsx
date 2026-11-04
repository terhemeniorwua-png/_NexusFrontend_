'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountTypeSelector, type AuthAccountType } from './AccountTypeSelector';
import { AuthForm } from './AuthForm';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password' | 'verify-email';

export function AuthPage({ mode, token, email, initialAccountType, redirectPath }: { mode: AuthMode; token?: string; email?: string; initialAccountType?: AuthAccountType; redirectPath?: string }) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AuthAccountType | null>(initialAccountType ?? null);
  const [entryMode, setEntryMode] = useState<'sign-in' | 'sign-up'>(mode === 'sign-in' ? 'sign-in' : 'sign-up');
  // A redirect target, such as an invitation link, already determines the
  // workflow, so asking for an account type first would add a step that
  // cannot change the outcome.
  const requiresAccountSelection = (mode === 'sign-in' || mode === 'sign-up') && !redirectPath;
  const activeMode = requiresAccountSelection ? (accountType ? entryMode : mode) : mode;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4 py-10">
      {requiresAccountSelection && <AccountTypeSelector open={!accountType} intent={entryMode} onClose={() => router.replace('/')} onSelect={setAccountType} />}
      {(!requiresAccountSelection || accountType) && (
        <AuthForm
          mode={activeMode}
          initialToken={token}
          initialEmail={email}
          accountType={accountType ?? undefined}
          redirectPath={redirectPath}
          onSwitchMode={requiresAccountSelection ? setEntryMode : undefined}
          onBackToAccountType={requiresAccountSelection ? () => setAccountType(null) : undefined}
        />
      )}
    </main>
  );
}
