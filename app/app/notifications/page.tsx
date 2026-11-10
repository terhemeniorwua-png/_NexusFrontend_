'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { ApiRequestError } from '@/lib/api';
import {
  listNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreference,
  listActivity,
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_GROUPS,
  NOTIFICATION_TYPE_LABELS,
  type NotificationSummary,
  type NotificationPreference,
  type ActivityEntry,
  type NotificationType,
} from '@/services/notifications';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dayGroupLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (startOfDate === startOfToday) return 'Today';
  if (startOfDate === startOfToday - dayMs) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function buildDefaultPreferences(): Record<NotificationType, boolean> {
  const defaults = {} as Record<NotificationType, boolean>;
  for (const type of ALL_NOTIFICATION_TYPES) defaults[type] = true;
  return defaults;
}

function preferencesToMap(prefs: NotificationPreference[]): Record<NotificationType, boolean> {
  const map = buildDefaultPreferences();
  for (const p of prefs) map[p.type] = p.inAppEnabled;
  return map;
}

// ─── Inbox tab ────────────────────────────────────────────────────────────────

function InboxTab() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [markingAll, setMarkingAll] = useState(false);
  const [confirmMarkAll, setConfirmMarkAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const latestLoad = useRef(0);

  const load = useCallback(async (opts: {
    cursor?: string;
    unreadOnly: boolean;
    type?: NotificationType;
    append?: boolean;
  }) => {
    const seq = ++latestLoad.current;
    if (opts.append) setLoadingMore(true);
    else { setLoading(true); setError(null); }
    try {
      const result = await listNotifications({
        cursor: opts.cursor,
        limit: 25,
        unreadOnly: opts.unreadOnly || undefined,
        type: opts.type,
      });
      if (seq !== latestLoad.current) return;
      if (opts.append) {
        setNotifications((prev) => [...prev, ...result.items]);
      } else {
        setNotifications(result.items);
      }
      setNextCursor(result.nextCursor);
      setUnreadCount(result.unreadCount);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      setError(err instanceof ApiRequestError ? err.message : 'Could not load notifications.');
    } finally {
      if (seq === latestLoad.current) { setLoading(false); setLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active
      ? load({ unreadOnly, type: typeFilter || undefined })
      : undefined);
    return () => { active = false; };
  }, [unreadOnly, typeFilter, load]);

  async function handleMarkRead(notificationId: string) {
    setMarkingIds((prev) => new Set([...prev, notificationId]));
    try {
      await markNotificationsRead([notificationId]);
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } finally {
      setMarkingIds((prev) => { const next = new Set(prev); next.delete(notificationId); return next; });
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not mark all as read.');
    } finally {
      setMarkingAll(false);
      setConfirmMarkAll(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading notifications">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <Skeleton className="mt-1 size-3 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-text-secondary)]">
            {unreadCount > 0
              ? <><strong className="text-[var(--color-text-primary)]">{unreadCount}</strong> unread</>
              : 'All caught up'}
          </span>
          <Checkbox
            id="unread-only"
            label="Unread only"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          <div className="w-full min-w-[12rem] sm:w-56">
            <Select
              id="notification-type"
              label="Notification type"
              srOnlyLabel
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as NotificationType | '')}
              options={[
                { value: '', label: 'All notification types' },
                ...ALL_NOTIFICATION_TYPES.map((type) => ({
                  value: type,
                  label: NOTIFICATION_TYPE_LABELS[type],
                })),
              ]}
            />
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmMarkAll(true)}
            disabled={markingAll}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error">
          {error}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load({ unreadOnly, type: typeFilter || undefined }); }}>
            Retry
          </Button>
        </Alert>
      )}

      {notifications.length === 0 && !error && (
        <EmptyState
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description={
            unreadOnly
              ? 'You have no unread notifications right now.'
              : 'Notifications will appear here when something happens that involves you.'
          }
        />
      )}

      {notifications.length > 0 && (
        <ul className="space-y-1" role="list" aria-label="Notifications">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={[
                'flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 transition-colors',
                n.readAt
                  ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]',
              ].join(' ')}
            >
              <span
                className={['mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-[var(--color-primary)]'].join(' ')}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="hover:underline"
                      onClick={() => { if (!n.readAt) void handleMarkRead(n.id); }}
                    >
                      {n.title}
                    </Link>
                  ) : n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{n.body}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="default">{n.type.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-[var(--color-text-muted)]">{relativeTime(n.createdAt)}</span>
                </div>
              </div>
              {!n.readAt && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { void handleMarkRead(n.id); }}
                  disabled={markingIds.has(n.id)}
                  aria-label="Mark as read"
                >
                  Read
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={() => { void load({ cursor: nextCursor, unreadOnly, type: typeFilter || undefined, append: true }); }}
            loading={loadingMore}
            disabled={loadingMore}
          >
            Load more
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmMarkAll}
        title="Mark all as read"
        description="This will mark all your unread notifications as read."
        confirmLabel="Mark all as read"
        onConfirm={() => { void handleMarkAllRead(); }}
        onClose={() => setConfirmMarkAll(false)}
        loading={markingAll}
      />
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const latestLoad = useRef(0);

  const load = useCallback(async (wsId: string, cursor?: string, append = false) => {
    if (!wsId) return;
    const seq = ++latestLoad.current;
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }
    try {
      const result = await listActivity(wsId, { cursor, limit: 25 });
      if (seq !== latestLoad.current) return;
      if (append) setItems((prev) => [...prev, ...result.items]);
      else setItems(result.items);
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      setError(err instanceof ApiRequestError ? err.message : 'Could not load activity.');
    } finally {
      if (seq === latestLoad.current) { setLoading(false); setLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load(workspaceId) : undefined);
    return () => { active = false; };
  }, [workspaceId, load]);

  const targetTypes = useMemo(
    () => Array.from(new Set(items.map((entry) => entry.targetType))).sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return items.filter((entry) => {
      if (targetTypeFilter && entry.targetType !== targetTypeFilter) return false;
      if (!query) return true;
      return [entry.action, entry.targetType, entry.targetId, entry.actorId ?? '']
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [items, searchText, targetTypeFilter]);

  const groupedItems = useMemo(() => {
    const groups: Array<{ label: string; entries: ActivityEntry[] }> = [];
    for (const entry of filteredItems) {
      const label = dayGroupLabel(entry.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.entries.push(entry);
      else groups.push({ label, entries: [entry] });
    }
    return groups;
  }, [filteredItems]);

  const hasFilters = searchText.trim().length > 0 || targetTypeFilter !== '';

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        {error}
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load(workspaceId); }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Workspace activity will appear here as your team uses Nexus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full min-w-[12rem] sm:w-64">
          <Input
            id="activity-search"
            type="search"
            label="Search activity"
            srOnlyLabel
            placeholder="Search action, target or actor"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="w-full min-w-[10rem] sm:w-48">
          <Select
            id="activity-target-type"
            label="Target type"
            srOnlyLabel
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All target types' },
              ...targetTypes.map((type) => ({ value: type, label: type })),
            ]}
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchText(''); setTargetTypeFilter(''); }}
          >
            Clear filters
          </Button>
        )}
        <span className="text-xs text-[var(--color-text-muted)]">
          {hasFilters
            ? `Showing ${filteredItems.length} of ${items.length} loaded`
            : `${items.length} loaded`}
        </span>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="No matching activity"
          description="Try a different search term or target type."
        />
      ) : (
        <div className="space-y-4">
          {groupedItems.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {group.label}
              </h2>
              <ul className="space-y-1" role="list">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {entry.action.replace(/_/g, ' ')}
                      </p>
                      <Badge variant="default">{entry.targetType}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {relativeTime(entry.createdAt)}
                      {entry.actorId ? ` · Actor ${entry.actorId}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={() => { void load(workspaceId, nextCursor, true); }}
            loading={loadingMore}
            disabled={loadingMore}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Preferences tab ──────────────────────────────────────────────────────────

function PreferencesTab({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [preferences, setPreferences] = useState<Record<NotificationType, boolean>>(buildDefaultPreferences());
  const latestLoad = useRef(0);

  const load = useCallback(async (wsId: string) => {
    if (!wsId) return;
    const seq = ++latestLoad.current;
    setLoading(true);
    setError(null);
    try {
      const prefs = await getNotificationPreferences(wsId);
      if (seq !== latestLoad.current) return;
      setPreferences(preferencesToMap(prefs));
    } catch (err) {
      if (seq !== latestLoad.current) return;
      setError(err instanceof ApiRequestError ? err.message : 'Could not load notification preferences.');
    } finally {
      if (seq === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load(workspaceId) : undefined);
    return () => { active = false; };
  }, [workspaceId, load]);

  async function handleToggle(type: NotificationType, enabled: boolean) {
    setPreferences((prev) => ({ ...prev, [type]: enabled }));
    setSaving((prev) => new Set([...prev, type]));
    setSaveErrors((prev) => { const next = { ...prev }; delete next[type]; return next; });
    try {
      await updateNotificationPreference(workspaceId, { type, inAppEnabled: enabled });
    } catch (err) {
      setPreferences((prev) => ({ ...prev, [type]: !enabled }));
      setSaveErrors((prev) => ({
        ...prev,
        [type]: err instanceof ApiRequestError ? err.message : 'Could not save.',
      }));
    } finally {
      setSaving((prev) => { const next = new Set(prev); next.delete(type); return next; });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading notification preferences">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="space-y-3">{[1, 2, 3].map((j) => <Skeleton key={j} className="h-5 w-full" />)}</div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        {error}
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load(workspaceId); }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Choose which events trigger in-app notifications for you in this workspace. Changes save immediately and do not affect email notifications or message unread counts.
      </p>
      {NOTIFICATION_TYPE_GROUPS.map((group) => (
        <Card key={group.label} className="p-5">
          <div className="mb-4 border-b border-[var(--color-border)] pb-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{group.label}</p>
          </div>
          <div className="space-y-3">
            {group.types.map((type) => (
              <div key={type}>
                <Checkbox
                  id={`pref-${type}`}
                  label={NOTIFICATION_TYPE_LABELS[type]}
                  checked={preferences[type]}
                  disabled={saving.has(type)}
                  onChange={(e) => { void handleToggle(type, e.target.checked); }}
                />
                {saveErrors[type] && (
                  <p className="ml-6 mt-0.5 text-xs text-[var(--color-error)]">{saveErrors[type]}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const NOTIFICATION_TABS = ['inbox', 'activity', 'preferences'] as const;
type NotificationTab = (typeof NOTIFICATION_TABS)[number];

function isNotificationTab(value: string | null): value is NotificationTab {
  return value !== null && (NOTIFICATION_TABS as readonly string[]).includes(value);
}

function NotificationsPageContent() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<NotificationTab>(
    isNotificationTab(requestedTab) ? requestedTab : 'inbox',
  );

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Notifications" />
        <EmptyState
          title="No workspace selected"
          description="Select a workspace to view your notifications."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        description="Your inbox, workspace activity, and notification preferences."
      />

      <Tabs
        activeTab={activeTab}
        onTabChange={(id) => {
          if (isNotificationTab(id)) setActiveTab(id);
        }}
        tabs={[
          { id: 'inbox', label: 'Inbox', content: <InboxTab /> },
          { id: 'activity', label: 'Activity', content: <ActivityTab workspaceId={workspaceId} /> },
          { id: 'preferences', label: 'Preferences', content: <PreferencesTab workspaceId={workspaceId} /> },
        ]}
      />
    </PageContainer>
  );
}

/**
 * The notification tabs can be deep-linked, e.g.
 * /app/notifications?tab=preferences from Settings. useSearchParams requires
 * a Suspense boundary under the App Router's cache components.
 */
export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader title="Notifications" />
          <p role="status" className="mt-4 text-sm text-[var(--color-text-secondary)]">
            Loading notifications…
          </p>
        </PageContainer>
      }
    >
      <NotificationsPageContent />
    </Suspense>
  );
}
