'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';

export interface MentionMember {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** IDs of members whose "@Name" appears in the text. */
export function extractMentionIds(body: string, members: MentionMember[]): string[] {
  return members
    .filter((m) => new RegExp(`(^|\\s)@${escapeRe(m.name)}(?![\\w])`).test(body))
    .map((m) => m.userId);
}

export function MentionTextarea({
  id,
  value,
  onChange,
  members,
  placeholder,
  rows = 3,
  disabled,
  ariaLabel,
  onSubmit,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  members: MentionMember[];
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  ariaLabel: string;
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [trigger, setTrigger] = useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [trigger, members]);

  function detect(text: string, caret: number) {
    const before = text.slice(0, caret);
    const m = /(^|\s)@([^\s@]{0,30})$/.exec(before);
    if (!m) { setTrigger(null); return; }
    setTrigger({ start: caret - m[2].length - 1, query: m[2] });
    setActive(0);
  }

  function select(member: MentionMember) {
    if (!trigger || !ref.current) return;
    const caret = ref.current.selectionStart;
    const next = `${value.slice(0, trigger.start)}@${member.name} ${value.slice(caret)}`;
    onChange(next);
    setTrigger(null);
    const pos = trigger.start + member.name.length + 2;
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(pos, pos); });
  }

  const open = trigger !== null && matches.length > 0;

  return (
    <div className="relative">
      <textarea
        ref={ref}
        id={id}
        aria-label={ariaLabel}
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${id}-mentions` : undefined}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
        onChange={(e) => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }}
        onClick={(e) => detect(value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setTrigger(null), 150)}
        onKeyDown={(e) => {
          if (!open) {
            if (e.key === 'Enter' && !e.shiftKey && onSubmit) { e.preventDefault(); onSubmit(); }
            return;
          }
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % matches.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + matches.length) % matches.length); }
          else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); select(matches[active]); }
          else if (e.key === 'Escape') { e.preventDefault(); setTrigger(null); }
        }}
      />
      {open && (
        <ul
          id={`${id}-mentions`}
          role="listbox"
          className="absolute bottom-full left-0 z-50 mb-1 max-h-60 w-72 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
        >
          {matches.map((m, i) => (
            <li
              key={m.userId}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); select(m); }}
              onMouseEnter={() => setActive(i)}
              className={['flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                i === active ? 'bg-[var(--color-surface-secondary)]' : ''].join(' ')}
            >
              <Avatar src={m.avatarUrl} name={m.name} size="xs" />
              <span className="truncate">{m.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Renders message text with "@Name" of known members in bold. */
export function renderMentions(body: string, members: MentionMember[]): ReactNode {
  if (!members.length || !body.includes('@')) return body;
  const names = members.map((m) => escapeRe(m.name)).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(^|\\s)(@(?:${names.join('|')}))(?![\\w])`, 'g');
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const start = m.index + m[1].length;
    if (start > last) out.push(body.slice(last, start));
    out.push(<strong key={start} className="font-semibold underline decoration-dotted">{m[2]}</strong>);
    last = start + m[2].length;
  }
  out.push(body.slice(last));
  return out;
}
