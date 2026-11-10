'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { RadioGroup } from '@/components/ui/Radio';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiRequestError } from '@/lib/api';
import { useTheme, type Theme } from '@/providers/ThemeProvider';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { formatBytes, getFileUsage, type FileUsage } from '@/services/files';
import { getUserProfile, type UserProfileView } from '@/services/profile';
import type { WorkspaceType } from '@/types/workspace';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function workspaceTypeLabel(type: WorkspaceType | undefined): string {
  if (type === 'COMPANY') return 'Company';
  if (type === 'INSTITUTION') return 'Institution';
  return 'Individual';
}

interface SettingsLinkCardProps {
  title: string;
  description: string;
  href: string;
  action: string;
}

/** A compact navigation card for a settings surface owned by another page. */
function SettingsLinkCard({ title, description, href, action }: SettingsLinkCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        {action}
      </Link>
    </Card>
  );
}

// ─── Account tab ─────────────────────────────────────────────────────────────

function AccountTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await getUserProfile());
    } catch (cause) {
      setError(errorMessage(cause, 'Your account details could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  return (
    <div className="space-y-4">
      {loading && (
        <Card className="p-5" aria-busy="true" aria-label="Loading account settings">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Card>
      )}

      {!loading && error && (
        <Alert variant="error" title="Account details unavailable">
          {error}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load(); }}>
            Retry
          </Button>
        </Alert>
      )}

      {!loading && !error && profile && (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                {profile.user.name}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{profile.user.email}</p>
            </div>
            <Badge variant={profile.user.emailVerifiedAt ? 'success' : 'warning'}>
              {profile.user.emailVerifiedAt ? 'Email verified' : 'Email not verified'}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--color-text-muted)]">Job title</dt>
              <dd className="mt-0.5 text-[var(--color-text-primary)]">
                {profile.profile.jobTitle || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Time zone</dt>
              <dd className="mt-0.5 text-[var(--color-text-primary)]">{profile.profile.timeZone}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Locale</dt>
              <dd className="mt-0.5 text-[var(--color-text-primary)]">{profile.profile.locale}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Member since</dt>
              <dd className="mt-0.5 text-[var(--color-text-primary)]">
                {new Date(profile.user.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      <SettingsLinkCard
        title="Profile details"
        description="Update your name, job title, bio, avatar, time zone, and locale."
        href="/app/profile"
        action="Edit profile"
      />
      <SettingsLinkCard
        title="Security and sessions"
        description="Change your password, request a verified email change, review signed-in devices, and sign out other sessions."
        href="/app/profile"
        action="Open security"
      />
    </div>
  );
}

// ─── Appearance tab ──────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Theme</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Choose how Nexus looks. The preference is stored in this browser and applies
          immediately; it does not change your account on other devices.
        </p>
        <RadioGroup
          className="mt-4"
          legend="Colour theme"
          name="settings-theme"
          value={theme}
          onChange={(value) => setTheme(value as Theme)}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'Match system' },
          ]}
          helperText={`Currently showing the ${resolvedTheme} theme.`}
        />
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Reduced motion</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Nexus follows your operating system&apos;s reduced-motion setting automatically.
          When it is enabled, non-essential transitions and animations are suppressed.
        </p>
      </Card>
    </div>
  );
}

// ─── Notifications tab ───────────────────────────────────────────────────────

function NotificationsTab() {
  return (
    <div className="space-y-4">
      <SettingsLinkCard
        title="Notification preferences"
        description="Choose which events trigger in-app notifications for you in the active workspace."
        href="/app/notifications?tab=preferences"
        action="Manage preferences"
      />
      <Card className="p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Messages stay in Messages
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Direct messages, channel messages, and message mentions are tracked by the
          Messages area. They are intentionally kept separate from the general
          notification bell and its unread count.
        </p>
        <Link
          href="/app/messages"
          className="mt-3 inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Go to Messages
        </Link>
      </Card>
    </div>
  );
}

// ─── Workspace tab ───────────────────────────────────────────────────────────

function WorkspaceTab() {
  const { activeWorkspace } = useWorkspaceContext();
  const [usage, setUsage] = useState<FileUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const workspaceId = activeWorkspace?.id ?? '';

  const loadUsage = useCallback(async (id: string) => {
    if (!id) return;
    setUsageLoading(true);
    setUsageError(null);
    try {
      setUsage(await getFileUsage(id));
    } catch (cause) {
      setUsageError(errorMessage(cause, 'Storage usage could not be loaded.'));
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return loadUsage(workspaceId);
    });
    return () => {
      active = false;
    };
  }, [workspaceId, loadUsage]);

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Select a workspace to view its settings and usage."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {activeWorkspace.name}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              {workspaceTypeLabel(activeWorkspace.type)} workspace
            </p>
          </div>
          <Badge variant="default">
            {activeWorkspace.organizationRole ?? activeWorkspace.role}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[var(--color-text-muted)]">Members</dt>
            <dd className="mt-0.5 text-[var(--color-text-primary)]">{activeWorkspace.memberCount}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)]">Projects</dt>
            <dd className="mt-0.5 text-[var(--color-text-primary)]">{activeWorkspace.projectCount}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)]">Teams</dt>
            <dd className="mt-0.5 text-[var(--color-text-primary)]">{activeWorkspace.teamCount}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Storage</h2>
          {usageLoading && <span role="status" className="text-xs text-[var(--color-text-muted)]">Loading…</span>}
        </div>
        {usageError ? (
          <Alert variant="error" className="mt-3">
            {usageError}
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => { void loadUsage(workspaceId); }}
            >
              Retry
            </Button>
          </Alert>
        ) : usage ? (
          <div className="mt-3">
            <p className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              {formatBytes(usage.totalBytes)}
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              {usage.fileCount} {usage.fileCount === 1 ? 'file' : 'files'} stored in this workspace
            </p>
            <Link
              href="/app/files"
              className="mt-3 inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Manage files
            </Link>
          </div>
        ) : (
          !usageLoading && (
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              Storage usage is unavailable.
            </p>
          )
        )}
        <p className="mt-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
          The backend reports total bytes and file count. A storage quota is not exposed by
          the current API, so no percentage is shown.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <SettingsLinkCard
          title="Workspace settings"
          description="Rename the workspace, change its description or visibility, and manage organisation details."
          href="/app/workspaces"
          action="Open settings"
        />
        <SettingsLinkCard
          title="Members and roles"
          description="Invite people, review join requests, and manage member roles and access."
          href="/app/members"
          action="Manage members"
        />
        <SettingsLinkCard
          title="Billing and plan"
          description="Review the subscription, seats, renewal date, and payment history."
          href="/app/billing"
          action="Open billing"
        />
        <SettingsLinkCard
          title="Integrations"
          description="Connect and manage Google, Microsoft, and other workspace integrations."
          href="/app/integrations"
          action="Manage integrations"
        />
      </div>
    </div>
  );
}

// ─── Privacy and security tab ────────────────────────────────────────────────

function PrivacySecurityTab() {
  return (
    <div className="space-y-4">
      <SettingsLinkCard
        title="Privacy requests"
        description="Request a copy of your data, ask for corrections, or manage deletion requests and their status."
        href="/app/privacy-requests"
        action="Open privacy requests"
      />
      <SettingsLinkCard
        title="Account security"
        description="Change your password, request a verified email change, and review or revoke signed-in sessions."
        href="/app/profile"
        action="Open security"
      />
      <Card className="p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Access and workspace isolation
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Your permissions are determined by the backend for each workspace. Switching
          workspaces reloads workspace-scoped data so private content from one workspace
          is not shown in another.
        </p>
      </Card>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Manage your account, appearance, notifications, workspace, and privacy preferences."
      />
      <Tabs
        className="mt-2"
        tabs={[
          { id: 'account', label: 'Account', content: <AccountTab /> },
          { id: 'appearance', label: 'Appearance', content: <AppearanceTab /> },
          { id: 'notifications', label: 'Notifications', content: <NotificationsTab /> },
          { id: 'workspace', label: 'Workspace', content: <WorkspaceTab /> },
          { id: 'privacy', label: 'Privacy and security', content: <PrivacySecurityTab /> },
        ]}
      />
    </PageContainer>
  );
}
