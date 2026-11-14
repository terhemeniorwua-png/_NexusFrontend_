'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Toaster } from '@/components/ui/Toaster';
import { AppShell } from '@/components/layout/AppShell';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { buildAppNavigation, workspaceKindFor } from '@/lib/app-navigation';
import { workspacePermissionKeys } from '@/lib/permissions';
import { useAvatarUrl } from '@/providers/AvatarUrlProvider';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { useRealtimeRefresh } from '@/providers/SocketProvider';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { signOut } from '@/services/auth';
import { getUnreadCount } from '@/services/notifications';
import { getUserProfile } from '@/services/profile';
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
  const { user, workspaces, activeWorkspace, loading, switchToWorkspace } = useWorkspaceContext();
  const { avatarUrl, setAvatarUrl } = useAvatarUrl();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { open: searchOpen, openSearch, closeSearch } = useGlobalSearch();

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

  if (loading || !user) return <>{children}</>;

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
