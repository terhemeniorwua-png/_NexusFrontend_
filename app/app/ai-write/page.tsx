'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { AiStatusBanner } from '@/components/ai/AiStatusBanner';
import { ApiRequestError } from '@/lib/api';
import { analyzeText, type AnalysisFeature, type WritingSuggestion } from '@/services/ai';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nexus-write-results-v1';
const MAX_TEXT_LENGTH = 50000;

// ─── Feature options ──────────────────────────────────────────────────────────

const FEATURE_OPTIONS: Array<{ value: AnalysisFeature; label: string; description: string }> = [
  { value: 'GRAMMAR', label: 'Grammar', description: 'Check for grammatical errors' },
  { value: 'SPELLING', label: 'Spelling', description: 'Check for spelling mistakes' },
  { value: 'CLARITY', label: 'Clarity', description: 'Improve sentence clarity' },
  { value: 'TONE', label: 'Tone', description: 'Analyze and adjust tone' },
  { value: 'SUMMARY', label: 'Summarise', description: 'Generate a summary' },
  { value: 'REWRITE', label: 'Rewrite', description: 'Suggest a rewrite' },
  { value: 'TRANSLATION', label: 'Translation', description: 'Translate to another language' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface NexusWriteResult {
  suggestions: WritingSuggestion[];
  summary: string | null | undefined;
  rewrite: string | null | undefined;
  serviceMessage: string;
  /** Character range of `text` that was sent for analysis. */
  analysedRange: { start: number; end: number };
}

function isNexusWriteResult(value: unknown): value is NexusWriteResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as NexusWriteResult).suggestions)
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NexusWritePage() {
  const [text, setText] = useState('');
  const [features, setFeatures] = useState<AnalysisFeature[]>(['GRAMMAR', 'SPELLING']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [suggestionStates, setSuggestionStates] = useState<
    Record<number, 'accepted' | 'dismissed'>
  >({});
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [result, setResult] = useState<NexusWriteResult | null>(null);

  const hasSelection = selection.end > selection.start;
  const acceptedCount = Object.values(suggestionStates).filter(
    (state) => state === 'accepted',
  ).length;

  // ─── Persistence ────────────────────────────────────────────────────────────

  // Restore previously persisted analysis results on first client render so they
  // survive page reloads.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (isNexusWriteResult(parsed)) {
        // Hydrate persisted results from localStorage on first client render. This is the
        // intended one-off synchronization with an external store, not a cascading render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResult(parsed);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Corrupted storage — ignore and start fresh.
    }
  }, []);

  // Persist the analysis result whenever it changes, but only when there is
  // actual content to persist. The entry is removed when the result is reset.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!result) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const hasContent =
      result.suggestions.length > 0 || Boolean(result.summary) || Boolean(result.rewrite);
    if (!hasContent) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch {
      // Storage unavailable or quota exceeded — persistence is best-effort only.
    }
  }, [result]);

  function toggleFeature(feature: AnalysisFeature) {
    setFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature],
    );
  }

  async function handleAnalyze() {
    if (loading || features.length === 0) return;

    const useSelection = selectionOnly && hasSelection;
    const analysedRange = useSelection
      ? { start: selection.start, end: selection.end }
      : { start: 0, end: text.length };
    const source = text.slice(analysedRange.start, analysedRange.end);
    const trimmed = source.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setApplyError(null);
    setApplySuccess(null);
    setSuggestionStates({});
    setResult(null);

    try {
      const response = await analyzeText(trimmed, features);
      setResult({
        suggestions: response.suggestions,
        summary: response.summary,
        rewrite: response.rewrite,
        serviceMessage: response.message,
        analysedRange,
      });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Applies one suggestion only after the user explicitly accepts it. The
   * original string is located inside the analysed range so the rest of the
   * document is never rewritten implicitly.
   */
  function acceptSuggestion(index: number, suggestion: WritingSuggestion) {
    if (!result) return;
    const { start, end } = result.analysedRange;
    const segment = text.slice(start, end);
    const offset = segment.indexOf(suggestion.original);
    if (offset === -1) {
      setApplyError(
        'This suggestion could not be applied because the original text was not found. Edit the text and analyse again.',
      );
      return;
    }

    const replaceStart = start + offset;
    const replaceEnd = replaceStart + suggestion.original.length;
    setText(`${text.slice(0, replaceStart)}${suggestion.suggestion}${text.slice(replaceEnd)}`);
    setApplyError(null);
    setApplySuccess(null);
    setSuggestionStates((prev) => ({ ...prev, [index]: 'accepted' }));
    setResult((prev) => {
      if (!prev) return prev;
      const delta = suggestion.suggestion.length - suggestion.original.length;
      return {
        ...prev,
        analysedRange: { start: prev.analysedRange.start, end: prev.analysedRange.end + delta },
      };
    });
  }

  function dismissSuggestion(index: number) {
    setSuggestionStates((prev) => ({ ...prev, [index]: 'dismissed' }));
  }

  /**
   * Applies every accepted suggestion to the current document in one batch.
   * Useful after the text has been edited, since it re-locates each original
   * against the current document state.
   */
  function applyAllAcceptedSuggestions() {
    if (!result || loading) return;
    const acceptedIndices = Object.keys(suggestionStates)
      .map((key) => Number(key))
      .filter((index) => suggestionStates[index] === 'accepted');
    if (acceptedIndices.length === 0) return;

    setApplyError(null);
    setApplySuccess(null);

    let currentText = text;
    let applied = 0;
    let skipped = 0;

    for (const index of acceptedIndices) {
      const suggestion = result.suggestions[index];
      const offset = currentText.indexOf(suggestion.original);
      if (offset === -1) {
        skipped++;
        continue;
      }
      currentText = `${currentText.slice(0, offset)}${suggestion.suggestion}${currentText.slice(
        offset + suggestion.original.length,
      )}`;
      applied++;
    }

    setText(currentText);
    if (applied === 0) {
      setApplyError(
        skipped === acceptedIndices.length
          ? 'All accepted suggestions are already applied.'
          : 'No accepted suggestions could be applied.',
      );
    } else {
      setApplySuccess(
        `Applied ${applied} suggestion${applied === 1 ? '' : 's'}.`,
      );
    }
  }

  function clearAll() {
    setText('');
    setSelection({ start: 0, end: 0 });
    setSelectionOnly(false);
    setSuggestionStates({});
    setResult(null);
    setError(null);
    setApplyError(null);
    setApplySuccess(null);
  }

  const nonDismissedCount = result
    ? result.suggestions.filter((_, i) => suggestionStates[i] !== 'dismissed').length
    : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Nexus Write"
        description="Writing assistance — grammar, spelling, clarity, tone, summaries, rewrites, and translation."
      />

      <AiStatusBanner className="mb-4" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — Input */}
        <div className="space-y-4">
          <Card className="p-4">
            <Textarea
              id="nw-text"
              label="Text to analyse"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onSelect={(e) => {
                const target = e.currentTarget;
                setSelection({ start: target.selectionStart, end: target.selectionEnd });
              }}
              rows={12}
              placeholder="Paste or type the text you want to analyse…"
              maxLength={MAX_TEXT_LENGTH}
              disabled={loading}
            />

            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {text.length} / {MAX_TEXT_LENGTH} characters
            </p>

            <div className="mt-3">
              <Checkbox
                id="nw-selection-only"
                label="Analyse selected text only"
                checked={selectionOnly}
                onChange={() => setSelectionOnly((value) => !value)}
                disabled={loading}
                helperText={
                  hasSelection
                    ? `${selection.end - selection.start} characters selected`
                    : 'Select text in the box above to limit what is sent for analysis.'
                }
              />
            </div>

            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                Analysis features
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_OPTIONS.map((opt) => (
                  <Checkbox
                    key={opt.value}
                    id={`nw-feat-${opt.value}`}
                    label={opt.label}
                    checked={features.includes(opt.value)}
                    onChange={() => toggleFeature(opt.value)}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={() => { void handleAnalyze(); }}
                loading={loading}
                disabled={
                  loading
                  || features.length === 0
                  || (selectionOnly ? !hasSelection : !text.trim())
                }
              >
                Analyse
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={clearAll}
                disabled={loading || (!text.trim() && !result)}
              >
                Clear all
              </Button>
              {loading && <Spinner className="h-4 w-4" aria-label="Analysing" />}
              {features.length === 0 && (
                <p className="text-xs text-[var(--color-warning)]">Select at least one feature</p>
              )}
              {selectionOnly && !hasSelection && features.length > 0 && (
                <p className="text-xs text-[var(--color-warning)]">
                  Select text in the box to analyse
                </p>
              )}
            </div>

            {error && <Alert variant="error" className="mt-3">{error}</Alert>}
          </Card>
        </div>

        {/* Right — Results */}
        <div className="space-y-4">
          {!result && !loading && (
            <EmptyState
              title="No analysis yet"
              description="Enter text and select features, then click Analyse."
            />
          )}

          {result && (
            <>
              {/* Service notice */}
              {result.serviceMessage && (
                <Alert variant="warning">{result.serviceMessage}</Alert>
              )}

              {/* Suggestions */}
              <Card className="p-4">
                <h2 className="mb-2 font-semibold text-[var(--color-text-primary)]">
                  Suggestions ({nonDismissedCount})
                </h2>
                {applyError && (
                  <Alert variant="error" className="mb-3">
                    {applyError}
                  </Alert>
                )}
                {applySuccess && (
                  <Alert variant="success" className="mb-3">
                    {applySuccess}
                  </Alert>
                )}
                {nonDismissedCount === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {result.suggestions.length === 0
                      ? 'No suggestions returned.'
                      : 'All suggestions have been dismissed or accepted.'}
                  </p>
                ) : (
                  <ul className="space-y-3" aria-label="Writing suggestions">
                    {result.suggestions.map((s, i) => {
                      const state = suggestionStates[i];
                      if (state === 'dismissed') return null;
                      return (
                        <li key={i} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-[var(--color-primary)]">{s.type}</span>
                            {state === 'accepted' && <Badge variant="success">Accepted</Badge>}
                          </div>
                          <p className="mt-1 text-sm">
                            <span className="line-through text-[var(--color-error)]">{s.original}</span>
                            {' → '}
                            <span className="text-[var(--color-success)]">{s.suggestion}</span>
                          </p>
                          {s.explanation && (
                            <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                              <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                                Why this change:
                              </p>
                              <p className="text-sm text-[var(--color-text-primary)]">
                                {s.explanation}
                              </p>
                            </div>
                          )}
                          {state !== 'accepted' && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => acceptSuggestion(i, s)}
                                disabled={loading}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => dismissSuggestion(i)}
                                disabled={loading}
                              >
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {acceptedCount > 0 && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={applyAllAcceptedSuggestions}
                      disabled={loading}
                    >
                      Apply all accepted suggestions
                    </Button>
                  </div>
                )}
              </Card>

              {/* Summary */}
              {features.includes('SUMMARY') && (
                <Card className="p-4">
                  <h2 className="mb-2 font-semibold text-[var(--color-text-primary)]">Summary</h2>
                  {result.summary ? (
                    <p className="text-sm text-[var(--color-text-primary)]">{result.summary}</p>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">No summary available yet.</p>
                  )}
                </Card>
              )}

              {/* Rewrite */}
              {features.includes('REWRITE') && (
                <Card className="p-4">
                  <h2 className="mb-2 font-semibold text-[var(--color-text-primary)]">Suggested rewrite</h2>
                  {result.rewrite ? (
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{result.rewrite}</p>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">No rewrite suggestion available yet.</p>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
