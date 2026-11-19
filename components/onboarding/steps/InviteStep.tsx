'use client';

import { useCallback, useState } from 'react';
import { createWorkspaceInvitation, type CreateInvitationInput } from '@/services/invitations';
import type { Workspace, WorkspaceRole } from '@/services/workspaces';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'COLLABORATOR', label: 'Collaborator' },
  { value: 'VIEWER', label: 'Viewer' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteStepProps {
  workspace: Workspace | null;
  onComplete: (action: 'complete' | 'skip') => void;
  onError: (message: string) => void;
  busy: boolean;
}

export default function InviteStep({
  workspace,
  onComplete,
  onError,
  busy,
}: InviteStepProps) {
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const addEmail = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) return;
    if (emails.includes(trimmed)) return;
    setEmails((current) => [...current, trimmed]);
    setEmail('');
  }, [email, emails]);

  const removeEmail = useCallback((toRemove: string) => {
    setEmails((current) => current.filter((item) => item !== toRemove));
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addEmail();
      }
    },
    [addEmail],
  );

  const handleSend = async () => {
    setInviteError(null);
    if (!workspace) {
      onComplete('complete');
      return;
    }
    setInviteBusy(true);
    try {
      await Promise.all(
        emails.map((item) => {
          const input: CreateInvitationInput = { email: item, role };
          return createWorkspaceInvitation(workspace.id, input);
        }),
      );
      onComplete('complete');
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Could not send invitations.';
      setInviteError(message);
      onError(message);
    } finally {
      setInviteBusy(false);
    }
  };

  const handleSkip = () => {
    onComplete('skip');
  };

  const isValidEmail = email.length > 0 && EMAIL_REGEX.test(email);

  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
        Invite teammates
      </p>
      <p className="text-base leading-7 text-[var(--color-text-secondary)]">
        Add people by email address and choose their default role. You can always add or
        remove members later from Settings.
      </p>

      {inviteError && (
        <Alert variant="error" title="Could not send invitations">{inviteError}</Alert>
      )}

      <div className="flex gap-2">
        <Input
          id="onboarding-invite-email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(event) => { setEmail(event.target.value); }}
          onKeyDown={handleKeyDown}
          disabled={busy || inviteBusy}
        />
        <Button
          size="md"
          disabled={busy || inviteBusy || !isValidEmail || emails.includes(email.trim())}
          onClick={() => { void addEmail(); }}
        >
          Add
        </Button>
      </div>

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]"
            >
              {item}
              <button
                type="button"
                onClick={() => { void removeEmail(item); }}
                className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                aria-label={`Remove ${item}`}
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <Select
        id="onboarding-invite-role"
        label="Default role"
        options={ROLE_OPTIONS}
        value={role}
        onChange={(event) => { setRole(event.target.value as WorkspaceRole); }}
        disabled={busy || inviteBusy}
        helperText="Role can be changed later in workspace settings."
      />

      {inviteBusy && (
        <p className="text-sm text-[var(--color-text-secondary)]">Sending invitations…</p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="secondary"
          size="md"
          disabled={busy || inviteBusy}
          onClick={() => { void handleSkip(); }}
        >
          Skip for now
        </Button>
        <Button
          size="md"
          loading={busy || inviteBusy}
          disabled={
            busy || inviteBusy || emails.length === 0
          }
          onClick={() => { void handleSend(); }}
        >
          Send invites
        </Button>
      </div>
    </div>
  );
}
