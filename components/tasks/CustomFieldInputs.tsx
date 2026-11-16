'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CustomFieldOption, ProjectCustomField } from '@/services/tasks';

export function customFieldValueToInput(field: ProjectCustomField, value: unknown): string | boolean | string[] {
  if (value === null || value === undefined) {
    if (field.type === 'CHECKBOX') return false;
    if (field.type === 'MULTI_SELECT') return [];
    return '';
  }
  if (field.type === 'CHECKBOX') return Boolean(value);
  if (field.type === 'MULTI_SELECT') return Array.isArray(value) ? value.map(String) : [];
  if (field.type === 'DATE' && typeof value === 'string') return value.slice(0, 10);
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return String(value);
}

export function inputToCustomFieldValue(field: ProjectCustomField, input: string | boolean | string[]): unknown {
  if (field.type === 'CHECKBOX') return Boolean(input);
  if (field.type === 'MULTI_SELECT') return Array.isArray(input) ? input : [];
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return null;
    if (field.type === 'NUMBER') {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : null;
    }
    if (field.type === 'DATE') return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
    return trimmed;
  }
  return null;
}

export function formatCustomFieldValue(field: ProjectCustomField, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'CHECKBOX') return value ? 'Yes' : 'No';
  if (field.type === 'MULTI_SELECT' && Array.isArray(value)) {
    if (value.length === 0) return '—';
    const opts = (field.options ?? []) as CustomFieldOption[];
    return value.map((v) => opts.find((o) => o.value === v)?.label ?? String(v)).join(', ');
  }
  if (field.type === 'SELECT' && typeof value === 'string') {
    const opts = (field.options ?? []) as CustomFieldOption[];
    return opts.find((o) => o.value === value)?.label ?? value;
  }
  if (field.type === 'DATE' && typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }
  return String(value);
}

interface Props {
  field: ProjectCustomField;
  value: unknown;
  onChange: (value: unknown) => void;
  idPrefix?: string;
}

export function CustomFieldInput({ field, value, onChange, idPrefix = 'cf' }: Props) {
  const id = `${idPrefix}-${field.id}`;
  const options = (field.options ?? []) as CustomFieldOption[];

  if (field.type === 'CHECKBOX') {
    const checked = Boolean(value);
    return (
      <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border border-[var(--color-border)]"
        />
        <span>{field.name}{field.required ? ' *' : ''}</span>
      </label>
    );
  }

  if (field.type === 'SELECT') {
    return (
      <Select
        id={id}
        label={`${field.name}${field.required ? ' *' : ''}`}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value || null)}
        options={[{ value: '', label: '—' }, ...options.map((o) => ({ value: o.value, label: o.label }))]}
      />
    );
  }

  if (field.type === 'MULTI_SELECT') {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div>
        <span className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">{field.name}{field.required ? ' *' : ''}</span>
        <div className="flex flex-wrap gap-2">
          {options.length === 0 ? (
            <span className="text-xs text-[var(--color-text-muted)]">No options</span>
          ) : (
            options.map((o) => {
              const active = selected.includes(o.value);
              return (
                <label key={o.value} className="inline-flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => {
                      const next = e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value);
                      onChange(next);
                    }}
                    className="h-4 w-4 rounded border border-[var(--color-border)]"
                  />
                  <span>{o.label}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const inputType = field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text';
  const strValue =
    field.type === 'DATE' && typeof value === 'string'
      ? value.slice(0, 10)
      : value === null || value === undefined
        ? ''
        : String(value);

  return (
    <Input
      id={id}
      label={`${field.name}${field.required ? ' *' : ''}`}
      type={inputType}
      value={strValue}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') { onChange(null); return; }
        if (inputType === 'number') { const n = Number(raw); onChange(Number.isFinite(n) ? n : null); return; }
        if (inputType === 'date') { onChange(raw ? new Date(`${raw}T00:00:00.000Z`).toISOString() : null); return; }
        onChange(raw);
      }}
    />
  );
}
