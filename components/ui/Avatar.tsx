import type { AvatarSize } from '@/types/ui';

interface AvatarProps {
  /** URL of the avatar image */
  src?: string | null;
  /** User's full name — used for alt text and fallback initials */
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name);
  const base = [
    'inline-flex items-center justify-center rounded-[var(--radius-full)]',
    'overflow-hidden select-none flex-shrink-0',
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={[base, 'object-cover'].join(' ')}
      />
    );
  }

  return (
    <span
      className={[
        base,
        'bg-[var(--color-primary)] text-white font-medium',
      ].join(' ')}
      aria-label={name}
      role="img"
    >
      {initials}
    </span>
  );
}
