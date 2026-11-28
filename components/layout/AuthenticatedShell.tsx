'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toaster } from '@/components/ui/Toaster';
import { AppShell } from '@/components/layout/AppShell';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { buildAppNavigation, workspaceKindFor } from '@/lib/app-navigation';
import { workspacePermissionKeys } from '@/lib/permissions';
import { useAvatarUrl } from '@/providers/AvatarUrlProvider';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { useRealtimeRefresh } from '@/providers/SocketProvider';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { signOut } from '@/services/auth';
import { getUnreadCount } from '@/services/notifications';
import { getUserProfile } from '@/services/profile';
import { getOnboardingStatus, type OnboardingStatus } from '@/services/onboarding';
import type { WorkspaceSummary } from '@/types/navigation';
import { resolveAvatarUrl } from '@/lib/avatar';
import { IncomingCallListener } from '@/components/meetings/IncomingCallListener';

/** How often to poll the unread count (ms). Only fires when the tab is visible. */
const UNREAD_POLL_INTERVAL = 60_000;

function toSwitcherSummary(
  workspace: ReturnType<typeof useWorkspaceContext>['workspaces'][number],
): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    kind: workspaceKindFor(workspace),
    kindLabel:
      workspace.type === 'INDIVIDUAL'
        ? 'Individual'
        : workspace.type === 'COMPANY'
          ? 'Company'
          : 'Institution',
    role: workspace.organizationRole ?? workspace.role,
  };
}

/**
 * AuthenticatedShell — mounts the shared application shell around every
 * authenticated route once the session and workspace context are available.
 *
 * Loads the user's avatar URL from GET /users/me on mount and exposes it
 * through AvatarUrlContext so the topbar UserMenu shows the uploaded photo.
 * The ProfilePage writes to the same context after an upload or deletion.
 *
 * Polls GET /notifications/unread-count on mount and every 60 s. The count
 * is kept strictly separate from messageUnreadCount — they are independent
 * props and are never combined.
 */
export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/app';
  const { user, workspaces, activeWorkspace, loading, error: workspaceError, retry, switchToWorkspace } = useWorkspaceContext();
  const { avatarUrl, setAvatarUrl } = useAvatarUrl();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { open: searchOpen, openSearch, closeSearch } = useGlobalSearch();

  // ─── Onboarding gate ──────────────────────────────────────────────────────
  const [onboardingRetry, setOnboardingRetry] = useState(0);
  const [resolvedGateKey, setResolvedGateKey] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  function isValidOnboardingStatus(value: unknown): value is OnboardingStatus {
    if (!value || typeof value !== 'object') return false;
    const status = value as Record<string, unknown>;
    return (
      typeof status.required === 'boolean' &&
      (status.completedAt === null || typeof status.completedAt === 'string') &&
      (status.currentStep === null || typeof status.currentStep === 'string') &&
      Array.isArray(status.pendingLegal) &&
      typeof status.aiAccessEnabled === 'boolean' &&
      Array.isArray(status.skippedSteps)
    );
  }

  const gateKey = user ? `${user.id}:${onboardingRetry}` : null;
  const onboardingLoading = gateKey !== null && resolvedGateKey !== gateKey;

  // Fetch onboarding status once the user is loaded. Independent of activeWorkspace
  // so the gate cannot be skipped when workspace context is unavailable.
  useEffect(() => {
    if (!gateKey) return;

    let active = true;
    async function load() {
      try {
        const result = await getOnboardingStatus();
        if (!active) return;
        if (!isValidOnboardingStatus(result)) {
          setOnboardingStatus(null);
          setShowOnboarding(false);
          setOnboardingError('We could not confirm your account setup status.');
          return;
        }
        setOnboardingStatus(result);
        setOnboardingError(null);
        setShowOnboarding(result.required === true && result.completedAt == null);
      } catch {
        if (!active) return;
        setOnboardingStatus(null);
        setShowOnboarding(false);
        setOnboardingError('We could not confirm your account setup status.');
      } finally {
        if (active) setResolvedGateKey(gateKey);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [gateKey]);

  // Load the avatar URL once the session is ready.
  useEffect(() => {
    if (!user) return;
    let active = true;
    getUserProfile()
      .then((profile) => {
        if (active) setAvatarUrl(resolveAvatarUrl(profile.profile.avatarUrl));
      })
      .catch(() => {
        // Non-fatal — the topbar falls back to initials.
      });
    return () => { active = false; };
  }, [user, setAvatarUrl]);

  const fetchUnread = useCallback(async () => {
    if (document.hidden) return;
    try {
      const { unreadCount } = await getUnreadCount();
      setNotificationUnreadCount(unreadCount);
    } catch {
      // Non-fatal — stale count shown until next successful poll.
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let active = true;

    async function poll() {
      if (!active) return;
      await fetchUnread();
    }

    void poll();
    pollTimer.current = setInterval(() => { void poll(); }, UNREAD_POLL_INTERVAL);

    return () => {
      active = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [user, fetchUnread]);

  // A reconnect can miss notifications; refresh the bell once the socket is
  // healthy again. This keeps the counter fresh without adding another poll.
  useRealtimeRefresh(() => { void fetchUnread(); });

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
      setNotificationUnreadCount(0);
      router.push('/');
    } catch {
      setSignOutError('Sign out could not be confirmed. Please try again.');
    }
  }

  if (loading) {
    return <p role="status" className="p-8 text-sm text-[var(--color-text-secondary)]">Loading your workspace…</p>;
  }

  if (workspaceError && !activeWorkspace) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16">
        <Alert variant="error" title="Workspace could not be loaded">{workspaceError}</Alert>
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!user) return <>{children}</>;

  // While onboarding status is being resolved, show a neutral shell so the
  // app content never flashes before the gate check completes.
  if (onboardingLoading) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16" role="status" aria-label="Loading account setup">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-3/4" />
      </div>
    );
  }

  if (onboardingError) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16">
        <Alert variant="error" title="Couldn't load your account setup">
          {onboardingError} Please retry, or sign out and sign back in.
        </Alert>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setOnboardingRetry((count) => count + 1)}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => { void handleSignOut(); }}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]"
          >
            Sign out
          </button>
        </div>
        {signOutError && (
          <div className="mt-4">
            <Alert variant="error" title="Sign out failed">{signOutError}</Alert>
          </div>
        )}
      </div>
    );
  }

  // Onboarding is required — render the modal over a neutral background and
  // block the rest of the app until it completes.
  if (
    showOnboarding &&
    onboardingStatus != null &&
    onboardingStatus.required === true &&
    onboardingStatus.completedAt == null
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
        <OnboardingModal
          open={true}
          onClose={() => {
            // Intentional no-op: the flow cannot be dismissed mid-flow.
          }}
          onComplete={() => {
            setShowOnboarding(false);
            setOnboardingStatus((current) => (current ? { ...current, required: false, completedAt: new Date().toISOString() } : current));
          }}
          userName={user.name}
          userEmail={user.email}
          workspace={activeWorkspace}
        />
      </div>
    );
  }

  const workspaceKind = workspaceKindFor(activeWorkspace);
  const permissions = workspacePermissionKeys(activeWorkspace);

  return (
    <AppShell
      navSections={buildAppNavigation(activeWorkspace)}
      workspaceKind={workspaceKind}
      permissions={permissions}
      activePath={pathname}
      workspaces={workspaces.map(toSwitcherSummary)}
      activeWorkspaceId={activeWorkspace?.id ?? ''}
      onWorkspaceChange={(workspaceId) => { void switchToWorkspace(workspaceId); }}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: avatarUrl,
      }}
      userMenuItems={[
        { id: 'profile', label: 'Profile and account', href: '/app/profile' },
        { id: 'settings', label: 'Settings', href: '/app/settings' },
        { id: 'workspaces', label: 'Manage workspaces', href: '/app/workspaces' },
      ]}
      onSignOut={() => { void handleSignOut(); }}
      onOpenSearch={openSearch}
      messagesHref="/app/messages"
      notificationsHref="/app/notifications"
      notificationUnreadCount={notificationUnreadCount}
    >
      {signOutError && (
        <div className="mx-auto w-full max-w-5xl px-5 pt-6 sm:px-8">
          <Alert variant="error" title="Sign out failed">{signOutError}</Alert>
        </div>
      )}
      {children}

      <GlobalSearch
        workspaceId={activeWorkspace?.id}
        open={searchOpen}
        onClose={closeSearch}
      />

      <IncomingCallListener />
      <Toaster />
    </AppShell>
  );
}
