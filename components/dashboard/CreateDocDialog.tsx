'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { ApiRequestError } from '@/lib/api';
import { createDocument } from '@/services/documents';

interface CreateDocDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId?: string | null;
  onCreated: () => void;
}

export function CreateDocDialog({
  open,
  onClose,
  workspaceId,
  projectId,
  onCreated,
}: CreateDocDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (busy) return;
    setTitle('');
    setContent('');
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createDocument(workspaceId, { title: title.trim(), content, projectId: projectId ?? null });
      setTitle('');
      setContent('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not create document.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New document">
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <Input
          id="overview-new-doc-title"
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          autoFocus
        />
        <Textarea
          id="overview-new-doc-content"
          label="Content (optional)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          maxLength={500_000}
        />
        <div className="flex gap-2">
          <Button type="submit" loading={busy} disabled={busy}>Create document</Button>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
