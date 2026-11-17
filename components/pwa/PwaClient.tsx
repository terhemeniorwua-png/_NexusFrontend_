'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const DISMISS_KEY = 'nexus-pwa-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaClient() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker (app shell/static assets only; SW itself never caches /api/backend).
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-fatal: app remains usable without SW.
      });
    }

    try {
      const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
      if (wasDismissed) queueMicrotask(() => setDismissed(true));
    } catch {
      // ignore
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } finally {
      setInstallEvent(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  }

  const showPrompt = !!installEvent && !dismissed && !installed;
  if (!showPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install PITERON"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg sm:inset-x-auto sm:right-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Install PITERON</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            Install the app for quick access. PITERON only caches the app shell and static assets, never your
            workspace data or API responses.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={handleDismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={() => { void handleInstall(); }}>
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
