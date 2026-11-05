import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

/**
 * Route-level loading state.
 *
 * Mirrors the shape of a typical page so the transition into real content is
 * calm rather than a full-page spinner.
 */
export default function Loading() {
  return (
    <PageContainer>
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col gap-6"
      >
        <span className="sr-only">Loading page</span>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <SkeletonCard />
      </div>
    </PageContainer>
  );
}
