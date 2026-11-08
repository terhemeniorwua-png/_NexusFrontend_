'use client';

/**
 * AvatarUrlContext
 *
 * Holds the current user's avatar URL in shared state so that
 * AuthenticatedShell (topbar UserMenu) and ProfilePage both stay in sync
 * without a full page reload.
 *
 * The profile page updates this context after a successful upload or
 * deletion; the shell reads it when building CurrentUserSummary.
 *
 * Initial value is null — the shell populates it from GET /users/me on
 * mount.
 */

import { createContext, useContext, useMemo, useState } from 'react';

interface AvatarUrlContextValue {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
}

const AvatarUrlContext = createContext<AvatarUrlContextValue | null>(null);

export function AvatarUrlProvider({ children }: { children: React.ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const value = useMemo<AvatarUrlContextValue>(
    () => ({ avatarUrl, setAvatarUrl }),
    [avatarUrl],
  );

  return (
    <AvatarUrlContext.Provider value={value}>
      {children}
    </AvatarUrlContext.Provider>
  );
}

export function useAvatarUrl(): AvatarUrlContextValue {
  const ctx = useContext(AvatarUrlContext);
  if (!ctx) throw new Error('useAvatarUrl must be used inside AvatarUrlProvider');
  return ctx;
}
