'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { ApiRequestError } from '@/lib/api';
import { globalSearch, type SearchCategory, type SearchResult } from '@/services/search';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: Array<{ value: SearchCategory; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'projects', label: 'Projects' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'documents', label: 'Docs' },
  { value: 'files', label: 'Files' },
  { value: 'channels', label: 'Channels' },
  { value: 'meetings', label: 'Meetings' },
];

const TYPE_ICONS: Record<string, string> = {
  project: '📁',
  task: '✅',
  document: '📄',
  file: '🗂️',
  channel: '💬',
  meeting: '📅',
};

function typeHref(result: SearchResult): string {
  const id = result.id;
  switch (result.type) {
    case 'project': return `/app/projects/${id}`;
    case 'task': return `/app/projects/${id}`; // task links need projectId; fallback to project
    case 'document': return `/app/documents`;
    case 'file': return `/app/files`;
    case 'channel': return `/app/messages`;
    case 'meeting': return `/app/meetings/${id}`;
    default: return '/app';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  workspaceId?: string;
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ workspaceId, open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearch = useRef(0);

  // Focus input when opened
  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSearched(false);
      setError(null);
    });
    return () => { active = false; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const search = useCallback(
    async (q: string, cat: SearchCategory) => {
      if (!q.trim() || q.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      const seq = ++latestSearch.current;
      setLoading(true);
      setError(null);
      try {
        const res = await globalSearch({
          q: q.trim(),
          category: cat,
          workspaceId: workspaceId || undefined,
        });
        if (seq !== latestSearch.current) return;
        setResults(res);
        setSearched(true);
      } catch (err) {
        if (seq !== latestSearch.current) return;
        setError(err instanceof ApiRequestError ? err.message : 'Search failed.');
      } finally {
        if (seq === latestSearch.current) setLoading(false);
      }
    },
    [workspaceId],
  );

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(val, category), 300);
  }

  function handleCategoryChange(cat: SearchCategory) {
    setCategory(cat);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) void search(query, cat);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-label="Global search"
        aria-modal="true"
        className="fixed left-1/2 top-[10vh] z-50 w-full max-w-2xl -translate-x-1/2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)] focus:outline-none"
        tabIndex={-1}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <span className="text-lg text-[var(--color-text-muted)]" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search projects, tasks, documents, files…"
            aria-label="Search query"
            className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          {loading && <Spinner className="h-4 w-4 shrink-0" />}
          <kbd className="hidden rounded border border-[var(--color-border)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)] sm:block">
            Esc
          </kbd>
        </div>

        {/* Category filter */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-3 py-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleCategoryChange(opt.value)}
              className={[
                'shrink-0 rounded-[var(--radius-md)] px-3 py-1 text-xs font-medium transition-colors',
                category === opt.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]',
              ].join(' ')}
              aria-pressed={category === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {error && (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-error)]">{error}</p>
          )}

          {!error && !loading && searched && results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {!error && !searched && !loading && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              Type at least 2 characters to search
            </p>
          )}

          {results.length > 0 && (
            <ul role="listbox" aria-label="Search results" className="py-2">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`} role="option" aria-selected="false">
                  <Link
                    href={typeHref(result)}
                    onClick={onClose}
                    className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-[var(--color-surface-secondary)] focus-visible:bg-[var(--color-surface-secondary)] focus-visible:outline-none"
                  >
                    <span className="shrink-0 text-base" aria-hidden="true">
                      {TYPE_ICONS[result.type] ?? '📌'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-[var(--color-text-primary)]">
                          {result.title}
                        </span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {result.type}
                        </Badge>
                      </div>
                      {result.description && (
                        <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                          {result.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)]">
          Press <kbd className="rounded border border-[var(--color-border)] px-1">↵</kbd> to navigate · Results respect your workspace access
        </div>
      </div>
    </>
  );
}
