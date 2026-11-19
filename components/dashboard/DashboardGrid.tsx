'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { getDashboardPreferences, saveDashboardPreferences } from '@/services/resources';
import { RecentCard } from './cards/RecentCard';
import { DocsCard } from './cards/DocsCard';
import { BookmarksCard } from './cards/BookmarksCard';
import { FoldersCard } from './cards/FoldersCard';
import { FilesCard } from './cards/FilesCard';
import { ListsCard } from './cards/ListsCard';
import { WorkloadCard } from './cards/WorkloadCard';

export type CardId =
  | 'recent'
  | 'docs'
  | 'bookmarks'
  | 'folders'
  | 'files'
  | 'lists'
  | 'workload';

const DEFAULT_CARDS: DashboardCardConfig[] = [
  { id: 'recent', label: 'Recent', visible: true, position: 0 },
  { id: 'docs', label: 'Docs', visible: true, position: 1 },
  { id: 'bookmarks', label: 'Bookmarks', visible: true, position: 2 },
  { id: 'folders', label: 'Folders', visible: true, position: 3 },
  { id: 'files', label: 'Files', visible: true, position: 4 },
  { id: 'lists', label: 'Lists', visible: true, position: 5 },
  { id: 'workload', label: 'Workload by Status', visible: true, position: 6 },
];

interface DashboardCardConfig {
  id: CardId;
  label: string;
  visible: boolean;
  position: number;
}

interface DashboardGridProps {
  workspaceId: string;
  projectId: string;
  // Data for each card
  recentItems: Array<{ id: string; type: string; title: string; url: string; updatedAt: string }>;
  docs: Array<{ id: string; title: string; updatedAt: string; url: string }>;
  bookmarks: Array<{ id: string; title: string; url: string }>;
  folders: Array<{ id: string; name: string; itemCount: number }>;
  files: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    uploadedById: string;
  }>;
  lists: Array<{
    id: string;
    name: string;
    taskCount: number;
    completedCount: number;
    url: string;
  }>;
  workload: Array<{
    userId: string;
    user: { id: string; name: string };
    statusCounts: Record<string, number>;
    total: number;
  }>;
  loading: Record<CardId, boolean>;
  errors: Record<CardId, string | null>;
  onRetry: (cardId: CardId) => void;
  onAddDoc: () => void;
  onAddBookmark: () => void;
  onAddFolder: () => void;
  onUploadFiles: () => void;
}

export function DashboardGrid({
  workspaceId,
  projectId,
  recentItems,
  docs,
  bookmarks,
  folders,
  files,
  lists,
  workload,
  loading,
  errors,
  onRetry,
  onAddDoc,
  onAddBookmark,
  onAddFolder,
  onUploadFiles,
}: DashboardGridProps) {
  const [preferences, setPreferences] = useState<DashboardCardConfig[]>(
    DEFAULT_CARDS,
  );
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getDashboardPreferences(workspaceId, projectId);
        if (!active) return;
        if (result.cards && result.cards.length > 0) {
          setPreferences(result.cards);
        }
      } catch {
        // Use defaults if preferences can't be loaded
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [workspaceId, projectId]);

  const handleSavePreferences = async () => {
    setSaving(true);
    setPrefError(null);
    try {
      const result = await saveDashboardPreferences(workspaceId, projectId, {
        cards: preferences,
        autoRefresh: false,
      });
      if (result.cards) {
        setPreferences(result.cards);
      }
    } catch (cause) {
      setPrefError(
        cause instanceof Error ? cause.message : 'Could not save layout.',
      );
    } finally {
      setSaving(false);
    }
  };

  const visibleCards = useMemo(
    () =>
      preferences
        .filter((c) => c.visible)
        .sort((a, b) => a.position - b.position),
    [preferences],
  );

  const moveCard = (id: CardId, direction: 'up' | 'down') => {
    setPreferences((current) => {
      const index = current.findIndex((c) => c.id === id);
      if (index === -1) return current;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((c, i) => ({ ...c, position: i }));
    });
  };

  const toggleCard = (id: CardId) => {
    setPreferences((current) =>
      current.map((c) =>
        c.id === id ? { ...c, visible: !c.visible } : c,
      ),
    );
  };

  const cardComponents: Record<CardId, React.ReactNode> = {
    recent: (
      <RecentCard
        items={recentItems}
        loading={loading.recent}
        error={errors.recent}
        onRetry={() => void onRetry('recent')}
      />
    ),
    docs: (
      <DocsCard
        items={docs}
        loading={loading.docs}
        error={errors.docs}
        onRetry={() => void onRetry('docs')}
        onAddDoc={() => void onAddDoc()}
      />
    ),
    bookmarks: (
      <BookmarksCard
        items={bookmarks}
        loading={loading.bookmarks}
        error={errors.bookmarks}
        onRetry={() => void onRetry('bookmarks')}
        onAddBookmark={() => void onAddBookmark()}
      />
    ),
    folders: (
      <FoldersCard
        items={folders}
        loading={loading.folders}
        error={errors.folders}
        onRetry={() => void onRetry('folders')}
        onAddFolder={() => void onAddFolder()}
      />
    ),
    files: (
      <FilesCard
        items={files}
        loading={loading.files}
        error={errors.files}
        onRetry={() => void onRetry('files')}
        onUploadFiles={() => void onUploadFiles()}
      />
    ),
    lists: (
      <ListsCard
        items={lists}
        loading={loading.lists}
        error={errors.lists}
        onRetry={() => void onRetry('lists')}
      />
    ),
    workload: (
      <WorkloadCard
        entries={workload}
        loading={loading.workload}
        error={errors.workload}
        onRetry={() => void onRetry('workload')}
      />
    ),
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCustomizeOpen(true)}>
            Customize
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void onAddDoc()}>
            Add card
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select
            label="Filter by assignee"
            id="dashboard-filter-assignee"
            options={[
              { value: '', label: 'All assignees' },
              { value: 'me', label: 'Me' },
            ]}
            value=""
            srOnlyLabel
          />
          <Select
            label="Filter by status"
            id="dashboard-filter-status"
            options={[
              { value: '', label: 'All statuses' },
              { value: 'ASSIGNED', label: 'Assigned' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'SUBMITTED', label: 'Submitted' },
            ]}
            value=""
            srOnlyLabel
          />
        </div>
      </div>

      {prefError && (
        <Alert variant="error">{prefError}</Alert>
      )}

      {/* Card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleCards.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No cards visible"
              description="Customize your dashboard to add cards."
              action={
                <Button onClick={() => setCustomizeOpen(true)}>Customize</Button>
              }
            />
          </div>
        ) : (
          visibleCards.map((card) => (
            <div key={card.id} className="flex flex-col h-full">
              {cardComponents[card.id]}
            </div>
          ))
        )}
      </div>

      <Modal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize dashboard"
        description="Show or hide cards and drag to reorder them."
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCustomizeOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => { void handleSavePreferences(); }} loading={saving}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Toggle cards to show or hide them. Use the up/down buttons to reorder.
          </p>
          {preferences.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`dashboard-card-${card.id}`}
                  checked={card.visible}
                  onChange={() => { void toggleCard(card.id); }}
                  className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
                <label htmlFor={`dashboard-card-${card.id}`} className="text-sm font-medium text-[var(--color-text-primary)]">
                  {card.label}
                </label>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={
                    card.position <= 0 || saving
                  }
                  onClick={() => { void moveCard(card.id, 'up'); }}
                  aria-label={`Move ${card.label} up`}
                >
                  ↑
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={
                    card.position >= preferences.length - 1 || saving
                  }
                  onClick={() => { void moveCard(card.id, 'down'); }}
                  aria-label={`Move ${card.label} down`}
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
