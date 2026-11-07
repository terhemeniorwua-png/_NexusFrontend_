'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_GROUPS,
  NOTIFICATION_TYPE_LABELS,
  type NotificationPreference,
  type NotificationType,
} from '@/services/notifications';
import { ApiRequestError } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDefaultPreferences(): Record<NotificationType, boolean> {
  const defaults = {} as Record<NotificationType, boolean>;
  for (const type of ALL_NOTIFICATION_TYPES) {
    defaults[type] = true; // Backend defaults all types to enabled.
  }
  return defaults;
}

function preferencesToMap(prefs: NotificationPreference[]): Record<NotificationType, boolean> {
  const map = buildDefaultPreferences();
  for (const pref of prefs) {
    map[pref.type] = pref.inAppEnabled;
  }
  return map;
}

function mapToPreferences(map: Record<NotificationType, boolean>): NotificationPreference[] {
  return ALL_NOTIFICATION_TYPES.map((type) => ({ type, inAppEnabled: map[type] }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [preferences, setPreferences] = useState<Record<NotificationType, boolean>>(buildDefaultPreferences());
  const [dirty, setDirty] = useState(false);

  // Workspace-switch guard.
  const latestLoad = useRef(0);

  const loadPreferences = useCallback(async (wsId: string) => {
    if (!wsId) return;
    const seq = ++latestLoad.current;
    setLoading(true);
    setLoadError(null);
    setSaveSuccess(false);
    try {
      const prefs = await getNotificationPreferences(wsId);
      if (seq !== latestLoad.current) return;
      setPreferences(preferencesToMap(prefs));
      setDirty(false);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load notification preferences.');
    } finally {
      if (seq === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? loadPreferences(workspaceId) : undefined);
    return () => { active = false; };
  }, [workspaceId, loadPreferences]);

  function handleToggle(type: NotificationType, enabled: boolean) {
    setPreferences((prev) => ({ ...prev, [type]: enabled }));
    setDirty(true);
    setSaveSuccess(false);
    setSaveError(null);
  }

  function handleToggleGroup(types: NotificationType[], enabled: boolean) {
    setPreferences((prev) => {
      const next = { ...prev };
      for (const type of types) next[type] = enabled;
      return next;
    });
    setDirty(true);
    setSaveSuccess(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (!workspaceId || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await updateNotificationPreferences(workspaceId, mapToPreferences(preferences));
      setPreferences(preferencesToMap(updated));
      setDirty(false);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : 'Could not save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Notifications" />
        <EmptyState
          title="No workspace selected"
          description="Select a workspace to manage notification preferences."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        description="Manage what in-app notifications you receive in this workspace."
      />

      {/* ── Notification feed — backend gap notice ──────────────────────────── */}
      <section aria-labelledby="notification-feed-heading" className="mb-8">
        <h2
          id="notification-feed-heading"
          className="mb-3 text-base font-semibold text-[var(--color-text-primary)]"
        >
          Notification inbox
        </h2>
        <Card className="p-5">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Notification inbox is not yet available
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            The backend does not currently provide a general notification list, unread count, or
            mark-as-read API. When those endpoints are available, this section will show your inbox
            with task assignments, mentions, meeting invites, join request decisions, and other
            workspace events. Message unread counts will remain separate.
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Missing backend APIs:{' '}
            <code className="font-mono">GET /notifications</code>,{' '}
            <code className="font-mono">POST /notifications/:id/read</code>,{' '}
            <code className="font-mono">POST /notifications/read-all</code>,{' '}
            <code className="font-mono">GET /notifications/unread-count</code>
          </p>
        </Card>
      </section>

      {/* ── Notification preferences ──────────────────────────────────────── */}
      <section aria-labelledby="notification-prefs-heading">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="notification-prefs-heading"
            className="text-base font-semibold text-[var(--color-text-primary)]"
          >
            In-app notification preferences
          </h2>
          {!loading && !loadError && (
            <div className="flex items-center gap-2">
              {dirty && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { void loadPreferences(workspaceId); }}
                  disabled={saving}
                >
                  Discard changes
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => { void handleSave(); }}
                disabled={!dirty || saving}
                loading={saving}
              >
                Save preferences
              </Button>
            </div>
          )}
        </div>

        <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
          Choose which events trigger in-app notifications for you in this workspace. These settings
          do not affect email notifications or message unread counts.
        </p>

        {loadError && (
          <Alert variant="error" className="mb-5" title="Could not load preferences">
            {loadError}
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => { void loadPreferences(workspaceId); }}
            >
              Retry
            </Button>
          </Alert>
        )}

        {saveError && (
          <Alert variant="error" className="mb-5" title="Could not save preferences">
            {saveError}
          </Alert>
        )}

        {saveSuccess && (
          <Alert variant="success" className="mb-5">
            Notification preferences saved.
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading notification preferences">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="mb-4 h-4 w-32" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-5 w-full" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : !loadError ? (
          <div className="space-y-4">
            {NOTIFICATION_TYPE_GROUPS.map((group) => {
              const allEnabled = group.types.every((t) => preferences[t]);

              return (
                <Card key={group.label} className="p-5">
                  {/* Group header toggle */}
                  <div className="mb-4 border-b border-[var(--color-border)] pb-3">
                    <Checkbox
                      id={`group-${group.label.replace(/\s+/g, '-').toLowerCase()}`}
                      label={group.label}
                      checked={allEnabled}
                      onChange={(e) => handleToggleGroup(group.types, e.target.checked)}
                      className="font-semibold"
                    />
                  </div>
                  {/* Individual type toggles */}
                  <div className="space-y-3">
                    {group.types.map((type) => (
                      <Checkbox
                        key={type}
                        id={`pref-${type}`}
                        label={NOTIFICATION_TYPE_LABELS[type]}
                        checked={preferences[type]}
                        onChange={(e) => handleToggle(type, e.target.checked)}
                      />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}
      </section>
    </PageContainer>
  );
}
