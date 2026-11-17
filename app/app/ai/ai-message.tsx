'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

// [project:81dc204f-...] style source markers produced by the AI service.
const CITE = /\[([a-z][a-z_]*):([0-9a-f][0-9a-f-]{7,})\]/gi;

// Edit to match the detail routes that exist in this app (see `ls app/app`).
// A type missing from this map renders as a plain, non-clickable chip.
const CITE_ROUTES: Record<string, (id: string) => string> = {
  project: (id) => `/app/projects/${id}`,
};

const CHIP =
  'mx-0.5 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)] no-underline';

function toMarkdown(content: string): string {
  return content.replace(CITE, (_m, type: string, id: string) => {
    const t = type.toLowerCase();
    const label = `${t.charAt(0).toUpperCase()}${t.slice(1)} · ${id.slice(0, 4)}`;
    return `[${label}](#cite-${t}-${id})`;
  });
}

const components: Components = {
  a({ href, children }) {
    if (href?.startsWith('#cite-')) {
      const rest = href.slice('#cite-'.length);
      const i = rest.indexOf('-');
      const type = rest.slice(0, i);
      const id = rest.slice(i + 1);
      const target = CITE_ROUTES[type]?.(id);
      return target ? (
        <Link href={target} className={`${CHIP} hover:underline`}>
          {children}
        </Link>
      ) : (
        <span className={CHIP}>{children}</span>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline">
        {children}
      </a>
    );
  },
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  h1: ({ children }) => <p className="font-semibold">{children}</p>,
  h2: ({ children }) => <p className="font-semibold">{children}</p>,
  h3: ({ children }) => <p className="font-semibold">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--color-border)] pl-3 text-[var(--color-text-muted)]">
      {children}
    </blockquote>
  ),
};

export function AiMessage({ content }: { content: string }) {
  return (
    <div className="space-y-2 break-words">
      <ReactMarkdown components={components}>{toMarkdown(content)}</ReactMarkdown>
    </div>
  );
}
