'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ApiRequestError } from '@/lib/api';
import { createPrivacyRequest, getMyPrivacyRequest, listMyPrivacyRequests, type PrivacyRequest } from '@/services/privacy-requests';

const schema = z.object({ type: z.enum(['ACCESS', 'CORRECTION', 'ERASURE', 'REDACTION']), description: z.string().trim().min(1).max(2000).optional(), targetId: z.string().uuid().optional() });
function errorText(error: unknown): string { return error instanceof ApiRequestError ? error.message : 'Privacy requests could not be loaded. Please try again.'; }
function date(value: string | null): string { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'; }

export default function PrivacyRequestsPage() {
  const [requests, setRequests] = useState<PrivacyRequest[] | null>(null);
  const [selected, setSelected] = useState<PrivacyRequest | null>(null);
  const [type, setType] = useState<PrivacyRequest['type']>('ACCESS');
  const [description, setDescription] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { let active = true; void listMyPrivacyRequests().then((items) => { if (active) setRequests(items); }).catch((cause: unknown) => { if (active) setError(errorText(cause)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setNotice(null);
    const parsed = schema.safeParse({ type, ...(description.trim() ? { description } : {}), ...(type === 'REDACTION' && targetId ? { targetId } : {}) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the request details.'); return; }
    if (type === 'REDACTION' && !parsed.data.targetId) { setError('Enter the task comment ID for a redaction request.'); return; }
    setWorking(true);
    try {
      const created = await createPrivacyRequest({ type, ...(parsed.data.description ? { description: parsed.data.description } : {}), ...(type === 'REDACTION' ? { targetType: 'COMMENT', targetId: parsed.data.targetId } : {}) });
      setRequests((current) => [created, ...(current ?? [])]); setDescription(''); setTargetId(''); setNotice('Your privacy request was submitted.');
    } catch (cause) { setError(errorText(cause)); }
    finally { setWorking(false); }
  }

  async function showDetail(id: string) {
    setError(null); setWorking(true);
    try { setSelected(await getMyPrivacyRequest(id)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setWorking(false); }
  }

  return <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8 sm:px-8">
    <header><Link href="/app/profile" className="text-sm font-medium text-[var(--color-primary)] hover:underline">← Back to profile</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight">Privacy requests</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">Submit and track a request about personal information held in Nexus. Shared collaboration records remain subject to access controls and review.</p></header>
    {error && <Alert variant="error" title="Request could not be completed">{error}</Alert>}{notice && <Alert variant="success" title="Submitted">{notice}</Alert>}
    <Card className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Submit a request</h2><form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
      <Select id="privacy-type" label="Request type" value={type} onChange={(event) => setType(event.target.value as PrivacyRequest['type'])} options={[{ value: 'ACCESS', label: 'Access' }, { value: 'CORRECTION', label: 'Correction' }, { value: 'ERASURE', label: 'Erasure' }, { value: 'REDACTION', label: 'Comment redaction' }]} />
      <Textarea id="privacy-description" label="Details (optional)" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} helperText="Up to 2,000 characters." />
      {type === 'REDACTION' && <Input id="privacy-target" label="Task comment ID" value={targetId} onChange={(event) => setTargetId(event.target.value)} required />}
      <div className="flex justify-end"><Button type="submit" loading={working}>Submit request</Button></div>
    </form></Card>
    <Card className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Your requests</h2>{loading ? <p role="status" className="mt-4 text-sm">Loading requests…</p> : requests?.length ? <ul className="mt-4 divide-y divide-[var(--color-border)]">{requests.map((request) => <li key={request.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{request.type.replaceAll('_', ' ').toLowerCase()}</p><p className="mt-1 text-xs text-[var(--color-text-secondary)]">Submitted {date(request.createdAt)} · Updated {date(request.updatedAt)}</p></div><div className="flex items-center gap-3"><Badge variant={request.status === 'COMPLETED' ? 'success' : request.status === 'REJECTED' ? 'error' : 'outline'}>{request.status.replaceAll('_', ' ').toLowerCase()}</Badge><Button size="sm" variant="secondary" disabled={working} onClick={() => void showDetail(request.id)}>Details</Button></div></li>)}</ul> : <EmptyState title="No privacy requests" description="Requests you submit will appear here." />}
      {selected && <div className="mt-5 rounded-lg border border-[var(--color-border)] p-4" aria-live="polite"><div className="flex justify-between gap-3"><h3 className="font-semibold">Request details</h3><Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button></div><p className="mt-2 text-sm">{selected.description || 'No additional details provided.'}</p>{selected.decisionNote && <p className="mt-2 text-sm">Decision note: {selected.decisionNote}</p>}{selected.outcome && <p className="mt-2 text-sm">Outcome: {selected.outcome}</p>}<p className="mt-2 text-xs text-[var(--color-text-secondary)]">Decided {date(selected.decidedAt)} · Completed {date(selected.completedAt)}</p></div>}
    </Card>
    <Card className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Collaboration records</h2><p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">Messages, comments, tasks and project updates are retained under existing access controls. Nexus reviews requests rather than automatically deleting collaboration history.</p></Card>
  </main>;
}
