'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  groupTaskDevLinks,
  isMaskedTaskDevLink,
  type TaskDevLink,
  type TaskDevLinkExternalType,
  type TaskDevLinkGroupType,
} from '@/services/dev-integrations';

const GROUP_LABELS: Record<TaskDevLinkGroupType, string> = {
  BRANCH: 'Branches',
  PULL_REQUEST: 'Pull requests',
  COMMIT: 'Commits',
};

const TYPE_LABELS: Record<TaskDevLinkExternalType, string> = {
  BRANCH: 'Branch',
  PULL_REQUEST: 'Pull request',
  COMMIT: 'Commit',
};

function stateVariant(state?: string | null): 'success' | 'warning' | 'info' | 'outline' | 'default' {
  switch ((state ?? '').toLowerCase()) {
    case 'open':
      return 'success';
    case 'merged':
      return 'info';
    case 'closed':
      return 'warning';
    case 'draft':
      return 'outline';
    default:
      return 'default';
  }
}

function reviewLabel(reviewState?: string | null): string | null {
  switch ((reviewState ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'Approved';
    case 'CHANGES_REQUESTED':
      return 'Changes requested';
    case 'COMMENTED':
      return 'Commented';
    default:
      return null;
  }
}

function itemLabel(link: TaskDevLink): string {
  if (link.externalType === 'PULL_REQUEST') {
    const number = link.externalNumber ? `PR #${link.externalNumber}` : 'Pull request';
    return link.title ? `${number} — ${link.title}` : number;
  }
  if (link.externalType === 'BRANCH') {
    return `Branch: ${link.ref ?? link.title ?? link.externalId}`;
  }
  return `Commit: ${link.title ?? link.externalId}`;
}

/** Prefer the in-app detail route; fall back to the provider URL from the backend. */
function itemHref(link: TaskDevLink): string | null {
  const repoBase = link.projectRepositoryId
    ? `/app/projects/${link.projectId}/code/${link.projectRepositoryId}`
    : null;
  if (repoBase && link.externalType === 'COMMIT') {
    return `${repoBase}/commit/${link.externalId}`;
  }
  if (repoBase && link.externalType === 'PULL_REQUEST' && link.externalNumber) {
    return `${repoBase}/pull/${link.externalNumber}`;
  }
  return link.url;
}

function DevLinkItem({ link }: { link: TaskDevLink }) {
  // METADATA is masked by the backend. Render only the fields it leaves
  // unmasked: type, state and the masked repository name. No hyperlink and no
  // title/ref/review/merge content. NONE links never reach the client.
  if (isMaskedTaskDevLink(link)) {
    return (
      <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
        <Badge variant="outline">{TYPE_LABELS[link.externalType]}</Badge>
        {link.state ? <Badge variant={stateVariant(link.state)}>{link.state}</Badge> : null}
        {link.repositoryFullName ? (
          <span className="text-[var(--color-text-secondary)]">{link.repositoryFullName}</span>
        ) : null}
      </li>
    );
  }

  // READ and LINK (and links with no attached repository) receive the full
  // backend fields. This section is read-only: no link or unlink controls.
  const href = itemHref(link);
  const label = itemLabel(link);
  const merged = (link.state ?? '').toLowerCase() === 'merged' || !!link.mergedAt;
  const review = reviewLabel(link.reviewState);

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{TYPE_LABELS[link.externalType]}</Badge>
        {link.state ? <Badge variant={stateVariant(link.state)}>{link.state}</Badge> : null}
        {merged ? <Badge variant="info">Merged</Badge> : null}
        {review ? <Badge variant="default">{review}</Badge> : null}
      </div>
      <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
        {href ? (
          <Link className="underline underline-offset-2" href={href}>
            {label}
          </Link>
        ) : (
          label
        )}
      </p>
      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
        {link.repositoryFullName ? <span>{link.repositoryFullName}</span> : null}
        {link.headRef || link.baseRef ? (
          <span>{link.headRef ?? '—'} → {link.baseRef ?? '—'}</span>
        ) : link.ref ? (
          <span>{link.ref}</span>
        ) : null}
        {link.externalType === 'PULL_REQUEST' && link.reviewerLogin ? (
          <span>Reviewed by {link.reviewerLogin}</span>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Read-only task-page section. Renders exactly the links returned by the
 * backend — grouped by external type — and never invents hidden items.
 */
export function LinkedDevelopmentItems({
  links,
  loading,
  error,
  onRetry,
}: {
  links: TaskDevLink[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Linked development items</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Branches, pull requests and commits linked to this task.
      </p>

      {loading ? (
        <div className="mt-3 space-y-2" role="status" aria-label="Loading linked development items" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
          {onRetry ? (
            <Button className="mt-2" size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : links.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          No development items are linked to this task yet.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {groupTaskDevLinks(links).map((group) => (
            <section key={group.type} aria-label={`${GROUP_LABELS[group.type]} linked items`}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {GROUP_LABELS[group.type]}
              </h3>
              <ul className="divide-y divide-[var(--color-border)]" role="list">
                {group.items.map((link) => (
                  <DevLinkItem key={link.id} link={link} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
