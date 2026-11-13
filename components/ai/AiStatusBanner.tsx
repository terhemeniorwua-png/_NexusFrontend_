'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { getAiHealth, type AiHealthStatus } from '@/services/ai';

/**
 * AiStatusBanner — shows an AI service-availability warning only when the
 * provider cannot serve requests.
 *
 * When the provider is healthy the banner renders nothing, so pages are no
 * longer cluttered with a stale "preview mode" notice now that AI runs
 * in-process via OpenRouter.
 *
 * States:
 * - loading (health check in flight): renders nothing — no flash of a warning.
 * - request failure: "The AI service is temporarily unavailable."
 * - configured: false: "AI is not enabled on this server."
 * - status: 'down': "The AI service is temporarily unavailable."
 * - configured: true && status: 'up': renders nothing.
 */
export function AiStatusBanner({
  className = '',
}: {
  className?: string;
}) {
  const [health, setHealth] = useState<AiHealthStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getAiHealth()
      .then((status) => {
        if (active) {
          setFailed(false);
          setHealth(status);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setHealth(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // While the health check is in flight there is nothing to communicate yet.
  if (health === null && !failed) return null;

  // The provider could not be reached at all.
  if (failed) {
    return (
      <Alert variant="warning" className={className}>
        The AI service is temporarily unavailable.
      </Alert>
    );
  }

  // `health` is non-null here: the loading branch returns when health is null
  // and the request has not failed, and the failed branch returns above.
  if (!health) return null;

  // The provider is intentionally disabled on this server.
  if (!health.configured) {
    return (
      <Alert variant="warning" className={className}>
        AI is not enabled on this server.
      </Alert>
    );
  }

  // The provider is reachable but not healthy.
  if (health.status !== 'up') {
    return (
      <Alert variant="warning" className={className}>
        The AI service is temporarily unavailable.
      </Alert>
    );
  }

  // Healthy: nothing to show.
  return null;
}
