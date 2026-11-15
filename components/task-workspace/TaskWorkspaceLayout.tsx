'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import type { TaskActivityItem, TaskAssignee, TaskPersonRef, TaskSummary } from '@/services/tasks';
import { TaskWorkspaceSidebar, type WorkspaceSection } from './TaskWorkspaceSidebar';

export function TaskWorkspaceLayout({
  activeSection,
  onSectionChange,
  projectId,
  projectName,
  header,
  children,
  assignees,
  assignedBy,
  reviewer,
  startDate,
  dueDate,
  overdue,
  recentActivity,
  onContactOwner,
}: {
  activeSection: WorkspaceSection;
  onSectionChange: (s: WorkspaceSection) => void;
  projectId: string;
  projectName?: string;
  header: ReactNode;
  children: ReactNode;
  assignees: TaskAssignee[];
  assignedBy: string | null;
  reviewer: TaskPersonRef | null;
  startDate: string | null;
  dueDate: string | null;
  overdue: boolean;
  recentActivity: TaskActivityItem[];
  onContactOwner: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {header}
      <div className="border-b border-[var(--color-border)] p-3 md:hidden">
        <Select
          id="section-switcher"
          label="Section"
          value={activeSection}
          onChange={(e) => onSectionChange(e.target.value as WorkspaceSection)}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'subtasks', label: 'Subtasks' },
            { value: 'attachments', label: 'Attachments' },
            { value: 'discussion', label: 'Discussion' },
            { value: 'activity', label: 'Activity' },
          ]}
        />
      </div>
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden border-r border-[var(--color-border)] p-3 md:block" aria-label="Workspace navigation">
          <TaskWorkspaceSidebar active={activeSection} onSelect={onSectionChange} projectId={projectId} projectName={projectName} />
        </aside>

        <main className="min-w-0 p-4 sm:p-5" aria-label="Task workspace content">
          {children}
        </main>

        <aside className="border-t border-[var(--color-border)] p-4 md:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0" aria-label="Task context">
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold">People</h2>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-[var(--color-text-secondary)]">Assignee(s)</dt><dd>{assignees.length ? assignees.map((a) => a.user.name).join(', ') : '—'}</dd></div>
                <div><dt className="text-[var(--color-text-secondary)]">Assigned by</dt><dd>{assignedBy ?? '—'}</dd></div>
                <div><dt className="text-[var(--color-text-secondary)]">Reviewer</dt><dd>{reviewer?.name ?? '—'}</dd></div>
              </dl>
            </Card>
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold">Schedule</h2>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-[var(--color-text-secondary)]">Start</dt><dd>{startDate ? new Date(startDate).toLocaleString() : '—'}</dd></div>
                <div><dt className="text-[var(--color-text-secondary)]">Due</dt><dd>{dueDate ? new Date(dueDate).toLocaleString() : '—'} {overdue ? <span className="ml-1 text-[var(--color-danger)]">(Overdue)</span> : null}</dd></div>
              </dl>
            </Card>
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold">Recent activity</h2>
              {recentActivity.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">No recent activity.</p> : (
                <ul className="space-y-2" role="list">
                  {recentActivity.slice(0, 5).map((item) => (
                    <li key={item.id} className="text-sm">
                      <p className="font-medium">{item.action.replace(/[._]/g, ' ')}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{new Date(item.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold">Quick actions</h2>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="secondary" onClick={onContactOwner}>Contact task owner</Button>
                <Button size="sm" variant="secondary" disabled title="Coming soon">Log time (Coming soon)</Button>
                <Button size="sm" variant="secondary" disabled title="Coming soon">Report blocker (Coming soon)</Button>
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
