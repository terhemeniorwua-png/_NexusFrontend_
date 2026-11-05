import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export function AccessState({ status, onRetry }: { status: 401 | 403; onRetry?: () => void }) {
  return <Card className="p-5 sm:p-7"><EmptyState title={status === 401 ? 'Sign in to continue' : 'You do not have access'} description={status === 401 ? 'Your session is no longer available. Sign in again to reopen this workspace.' : 'Your current workspace role does not grant access to this resource.'} action={status === 401 ? <Link className="text-[var(--color-primary)] underline" href="/sign-in">Sign in</Link> : onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : undefined} /></Card>;
}
