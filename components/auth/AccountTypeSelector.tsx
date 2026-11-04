'use client';

import { Modal } from '@/components/ui/Modal';

export type AuthAccountType = 'personal' | 'institution' | 'business';

const accountTypes: { id: AuthAccountType; title: string; description: string }[] = [
  { id: 'personal', title: 'Personal account', description: 'Manage your own work, tasks, projects, and personal workspace.' },
  { id: 'institution', title: 'Institution account', description: 'Bring schools, colleges, universities, and other institutions together.' },
  { id: 'business', title: 'Business account', description: 'Connect your company, teams, projects, and shared work.' },
];

function AccountIcon({ type }: { type: AuthAccountType }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5">
      {type === 'personal' && <><circle cx="12" cy="8" r="3.3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>}
      {type === 'institution' && <><path d="M3.5 20.5h17M5.5 20.5v-12l6.5-4 6.5 4v12M9 20.5v-4h6v4M8.5 10h.01M12 10h.01M15.5 10h.01M8.5 13h.01M12 13h.01M15.5 13h.01" strokeLinecap="round" strokeLinejoin="round" /></>}
      {type === 'business' && <><rect x="3.5" y="7" width="17" height="13" rx="2" /><path d="M9 7V4.5h6V7M3.5 12h17M10 12v2h4v-2" strokeLinecap="round" strokeLinejoin="round" /></>}
    </svg>
  );
}

export function AccountTypeSelector({
  open,
  intent,
  onClose,
  onSelect,
}: {
  open: boolean;
  intent: 'sign-in' | 'sign-up';
  onClose: () => void;
  onSelect: (type: AuthAccountType) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Choose your account type" description="Choose the workspace experience you want to continue with." maxWidth="lg">
      <div className="p-5 sm:p-6">
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">{intent === 'sign-in' ? 'Choose which workspace you want to open after signing in.' : 'Choose how you plan to start with Nexus.'}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {accountTypes.map((account) => (
            <button
              type="button"
              key={account.id}
              onClick={() => onSelect(account.id)}
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><AccountIcon type={account.id} /></span>
              <span className="mt-4 block font-semibold text-[var(--color-text-primary)]">{account.title}</span>
              <span className="mt-2 block text-sm leading-5 text-[var(--color-text-secondary)]">{account.description}</span>
              <span className="mt-4 block text-sm font-medium text-[var(--color-primary)]">Continue <span aria-hidden="true">→</span></span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
