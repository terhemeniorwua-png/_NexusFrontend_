import Link from 'next/link';

export function PolicyLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Legal policies" className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs ${className}`}>
      <Link className="text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text-primary)] hover:underline" href="/terms">Terms of Service</Link>
      <Link className="text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text-primary)] hover:underline" href="/privacy">Privacy Policy</Link>
    </nav>
  );
}
