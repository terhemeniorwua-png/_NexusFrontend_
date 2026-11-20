'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ApiRequestError } from '@/lib/api';
import { createFolder } from '@/services/resources';

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId?: string | null;
  onCreated: () => void;
}

export function CreateFolderDialog({
  open,
  onClose,
  workspaceId,
  projectId,
  onCreated,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (busy) return;
    setName('');
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Folder name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createFolder(workspaceId, { name: name.trim() }, projectId);
      setName('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not create folder.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add folder">
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <Input
          id="new-folder-name"
          label="Folder name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="submit" loading={busy} disabled={busy}>Create folder</Button>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
