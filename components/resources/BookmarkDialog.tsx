'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createBookmark } from '@/services/resources';

interface BookmarkDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onAdded: () => void;
}

export function BookmarkDialog({
  open,
  onClose,
  workspaceId,
  onAdded,
}: BookmarkDialogProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAdd = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Enter a title.');
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError('Enter a valid URL (http or https).');
      return;
    }
    setBusy(true);
    try {
      await createBookmark(workspaceId, { title: title.trim(), url: url.trim() });
      onAdded();
      onClose();
      setTitle('');
      setUrl('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add bookmark.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add bookmark"
      maxWidth="sm"
    >
      <form onSubmit={(e) => { e.preventDefault(); void handleAdd(); }} className="space-y-4">
        <Input
          id="bookmark-title"
          label="Title"
          required
          value={title}
          onChange={(e) => { setTitle(e.target.value); }}
          maxLength={200}
          disabled={busy}
        />
        <Input
          id="bookmark-url"
          label="URL"
          type="url"
          required
          value={url}
          onChange={(e) => { setUrl(e.target.value); }}
          placeholder="https://example.com"
          disabled={busy}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={busy}>
            Add bookmark
          </Button>
        </div>
      </form>
    </Modal>
  );
}
