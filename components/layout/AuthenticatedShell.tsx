'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { AppShell } from '@/components/layout/AppShell';
import { buildAppNavigation, workspaceKindFor } from '@/lib/app-navigation';
import { workspacePermissionKeys } from '@/lib/permissions';
import { useAvatarUrl } from '@/providers/AvatarUrlProvider';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { signOut } from '@/services/auth';
import { getUnreadCount } from '@/services/notifications';
import { getUserProfile } from '@/services/profile';
import type { WorkspaceSummary } from '@/types/navigation';

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

  // Load the avatar URL once the session is ready.
  useEffect(() => {
    if (!user) return;
    let active = true;
    getUserProfile()
      .then((profile) => {
        if (active) setAvatarUrl(profile.profile.avatarUrl);
      })
      .catch(() => {
        // Non-fatal — the topbar falls back to initials.
      });
    return () => { active = false; };
  }, [user, setAvatarUrl]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    async function fetchUnread() {
      if (!active || document.hidden) return;
      try {
        const { unreadCount } = await getUnreadCount();
        if (active) setNotificationUnreadCount(unreadCount);
      } catch {
        // Non-fatal — stale count shown until next successful poll.
      }
    }

    void fetchUnread();
    pollTimer.current = setInterval(() => { void fetchUnread(); }, UNREAD_POLL_INTERVAL);

    return () => {
      active = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [user]);

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
        { id: 'workspaces', label: 'Manage workspaces', href: '/app/workspaces' },
      ]}
      onSignOut={() => { void handleSignOut(); }}
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
    </AppShell>
  );
}
