interface PageContainerProps {
  children: React.ReactNode;
  /** Maximum content width; defaults to the standard app width */
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Remove vertical padding when the container is nested */
  noPadding?: boolean;
  className?: string;
}

const widthClasses: Record<NonNullable<PageContainerProps['width']>, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

/**
 * PageContainer — consistent page width, padding, and centring.
 *
 * Use once per route around the page content. Keep PageHeader inside it so the
 * title aligns with the content below.
 */
export function PageContainer({
  children,
  width = 'lg',
  noPadding = false,
  className = '',
}: PageContainerProps) {
  return (
    <div
      className={[
        'mx-auto w-full',
        widthClasses[width],
        noPadding ? '' : 'px-4 py-6 sm:px-6 lg:px-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
