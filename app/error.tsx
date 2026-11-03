'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';

interface ErrorPageProps {
  /** Error thrown while rendering the route. */
  error: Error & { digest?: string };
  /** Retries rendering the route segment. */
  reset: () => void;
}

/**
 * Route-level error boundary.
 *
 * Shows a safe message rather than raw error details. The digest is the only
 * server-side reference displayed; error reporting and telemetry belong to the
 * approved observability setup rather than this component.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <PageContainer width="md">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Something went wrong
        </h1>

        <Alert variant="error" title="This page could not be displayed">
          Try again. If the problem continues, reload the page or contact your
          workspace administrator.
        </Alert>

        {error.digest && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            Reference: <code>{error.digest}</code>
          </p>
        )}

        <div>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </PageContainer>
  );
}
