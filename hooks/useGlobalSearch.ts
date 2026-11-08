/**
 * hooks/useGlobalSearch.ts
 *
 * Provides open/close state for the global search modal and registers the
 * Ctrl+K / Cmd+K keyboard shortcut.
 */

import { useCallback, useEffect, useState } from 'react';

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, openSearch, closeSearch };
}
