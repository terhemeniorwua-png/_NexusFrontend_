'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { ApiRequestError } from '@/lib/api';
import { analyzeText, type AnalysisFeature, type WritingSuggestion } from '@/services/ai';

// ─── Feature options ──────────────────────────────────────────────────────────

const FEATURE_OPTIONS: Array<{ value: AnalysisFeature; label: string; description: string }> = [
  { value: 'GRAMMAR', label: 'Grammar', description: 'Check for grammatical errors' },
  { value: 'SPELLING', label: 'Spelling', description: 'Check for spelling mistakes' },
  { value: 'CLARITY', label: 'Clarity', description: 'Improve sentence clarity' },
  { value: 'TONE', label: 'Tone', description: 'Analyze and adjust tone' },
  { value: 'SUMMARY', label: 'Summarise', description: 'Generate a summary' },
  { value: 'REWRITE', label: 'Rewrite', description: 'Suggest a rewrite' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NexusWritePage() {
  const [text, setText] = useState('');
  const [features, setFeatures] = useState<AnalysisFeature[]>(['GRAMMAR', 'SPELLING']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    suggestions: WritingSuggestion[];
    summary: string | null | undefined;
    rewrite: string | null | undefined;
    serviceMessage: string;
  } | null>(null);

  function toggleFeature(feature: AnalysisFeature) {
    setFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature],
    );
  }

  async function handleAnalyze() {
    const trimmed = text.trim();
    if (!trimmed || loading || features.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeText(trimmed, features);
      setResult({
        suggestions: response.suggestions,
        summary: response.summary,
        rewrite: response.rewrite,
        serviceMessage: response.message,
      });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Nexus Write"
        description="Writing assistance — grammar, clarity, summaries, and rewrites."
      />

      {/* Preview notice */}
      <Alert variant="warning" className="mb-4">
        <strong>Preview mode:</strong> The Nexus Write AI service is not yet connected to a live AI
        model. Analysis requests are accepted and validated but will return placeholder responses
        until the Python AI service is configured.
      </Alert>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — Input */}
        <div className="space-y-4">
          <Card className="p-4">
            <Textarea
              id="nw-text"
              label="Text to analyse"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Paste or type the text you want to analyse…"
              maxLength={50000}
              disabled={loading}
            />

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
                disabled={loading || !text.trim() || features.length === 0}
              >
                Analyse
              </Button>
              {loading && <Spinner className="h-4 w-4" aria-label="Analysing" />}
              {features.length === 0 && (
                <p className="text-xs text-[var(--color-warning)]">Select at least one feature</p>
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
                  Suggestions ({result.suggestions.length})
                </h2>
                {result.suggestions.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No suggestions returned.</p>
                ) : (
                  <ul className="space-y-3" aria-label="Writing suggestions">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-[var(--color-primary)]">{s.type}</span>
                        </div>
                        <p className="mt-1 text-sm">
                          <span className="line-through text-[var(--color-error)]">{s.original}</span>
                          {' → '}
                          <span className="text-[var(--color-success)]">{s.suggestion}</span>
                        </p>
                        {s.explanation && (
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{s.explanation}</p>
                        )}
                      </li>
                    ))}
                  </ul>
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
