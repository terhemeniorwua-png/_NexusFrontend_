'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiRequestError } from '@/lib/api';
import { deleteWorkspaceLogo, getWorkspaceLogo, uploadWorkspaceLogo } from '@/services/workspaces';
import type { Workspace } from '@/services/workspaces';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function WorkspaceLogoManager({ workspace }: { workspace: Workspace }) {
  const [url, setUrl] = useState<string | null>(null);
  const [hasLogo, setHasLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [version, setVersion] = useState(0);
  const canManage = workspace.role === 'OWNER' || workspace.organizationRole === 'COMPANY_ADMIN' || workspace.organizationRole === 'INSTITUTION_ADMIN';

  useEffect(() => {
    if (workspace.type !== 'COMPANY' && workspace.type !== 'INSTITUTION') return;
    let active = true;
    let objectUrl: string | null = null;
    void getWorkspaceLogo(workspace.id, workspace.type as 'COMPANY' | 'INSTITUTION').then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) { setUrl(objectUrl); setHasLogo(true); }
    }).catch((cause: unknown) => {
      if (active) {
        if (cause instanceof ApiRequestError && cause.status === 404) { setUrl(null); setHasLogo(false); }
        else setError(cause instanceof ApiRequestError ? cause.message : 'Workspace logo could not be loaded.');
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [workspace.id, workspace.type, version]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { setError('Choose a PNG, JPEG, or WebP image.'); return; }
    if (file.size > MAX_LOGO_BYTES) { setError('The logo must be no larger than 2 MB.'); return; }
    setBusy(true); setError(null); setNotice(null);
    try { await uploadWorkspaceLogo(workspace.id, workspace.type as 'COMPANY' | 'INSTITUTION', file); setNotice('Workspace logo saved.'); setUrl(null); setLoading(true); setVersion((current) => current + 1); }
    catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : 'Workspace logo could not be saved.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError(null); setNotice(null);
    try { await deleteWorkspaceLogo(workspace.id, workspace.type as 'COMPANY' | 'INSTITUTION'); setUrl(null); setHasLogo(false); setVersion((current) => current + 1); setNotice('Workspace logo removed.'); setConfirmRemove(false); }
    catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : 'Workspace logo could not be removed.'); }
    finally { setBusy(false); }
  }

  if (workspace.type !== 'COMPANY' && workspace.type !== 'INSTITUTION') return null;
  return <section className="mt-5 border-t border-[var(--color-border)] pt-5" aria-labelledby="workspace-logo-heading">
    <h3 id="workspace-logo-heading" className="font-semibold">Workspace logo</h3>
    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Private PNG, JPEG, or WebP image; maximum 2 MB.</p>
    {error && <Alert className="mt-3" variant="error" title="Logo action failed">{error}</Alert>}{notice && <Alert className="mt-3" variant="success">{notice}</Alert>}
    {loading ? <p role="status" className="mt-3 text-sm">Loading logo…</p> : url ? <Image src={url} unoptimized width={80} height={80} alt={`${workspace.name} logo`} className="mt-3 size-20 rounded-lg border border-[var(--color-border)] object-contain" /> : <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No logo uploaded.</p>}
    {canManage ? <div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex min-h-10 cursor-pointer items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary)]">{hasLogo ? 'Replace logo' : 'Upload logo'}<input aria-label={hasLogo ? 'Replace workspace logo' : 'Upload workspace logo'} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(event) => void upload(event)} /></label>{hasLogo && <Button type="button" variant="destructive" disabled={busy} onClick={() => setConfirmRemove(true)}>Remove logo</Button>}{busy && <span role="status" className="self-center text-sm">Saving…</span>}</div> : <p className="mt-3 text-xs text-[var(--color-text-secondary)]">Only workspace owners and administrators can change the logo.</p>}
    <ConfirmDialog open={confirmRemove} onClose={() => setConfirmRemove(false)} onConfirm={() => void remove()} title="Remove workspace logo?" description={`Remove the private logo for ${workspace.name}?`} confirmLabel="Remove logo" destructive loading={busy} />
  </section>;
}
