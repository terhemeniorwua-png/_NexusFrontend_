import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

interface PageAccessStateProps {
  title?: string;
  description?: string;
  backHref: string;
  backLabel?: string;
}

/**
 * Route-level state for pages the caller may open but not view, for example
 * project settings as a Viewer. This is a presentation guard only; the backend
 * still rejects the underlying requests.
 */
export function PageAccessState({
  title = "You don't have access to this page",
  description = 'Your project role does not include access to this page. Ask a project manager if you think you should have access.',
  backHref,
  backLabel = 'Back to project',
}: PageAccessStateProps) {
  return (
    <Card className="p-5 sm:p-7">
      <EmptyState
        title={title}
        description={description}
        action={
          <Link
            href={backHref}
            className="text-sm font-medium text-[var(--color-primary)] underline"
          >
            {backLabel}
          </Link>
        }
      />
    </Card>
  );
}

interface ProjectUnavailableStateProps {
  /** 404 means the project is missing or hidden; 403 means access was denied. */
  status: 403 | 404;
}

/** Full-project state rendered by the project layout when the permission fetch fails. */
export function ProjectUnavailableState({ status }: ProjectUnavailableStateProps) {
  return (
    <PageAccessState
      title={status === 404 ? 'Project not found or no access' : "You don't have access to this project"}
      description={
        status === 404
          ? 'This project may have been deleted, or it is private and you are not a member.'
          : 'Your workspace role does not grant access to this project.'
      }
      backHref="/app/projects"
      backLabel="Back to projects"
    />
  );
}
