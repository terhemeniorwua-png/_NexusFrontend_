'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { InvitationsPanel } from '@/components/members/InvitationsPanel';
import { JoinRequestsPanel } from '@/components/members/JoinRequestsPanel';
import { MembersPanel } from '@/components/members/MembersPanel';
import { workspaceCan } from '@/lib/permissions';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';

export default function MembersPage() {
  const { activeWorkspace, loading, retry } = useWorkspaceContext();
  const [activeTab, setActiveTab] = useState('members');

  if (loading) {
    return <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8"><p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading workspace members…</p></div>;
  }

  if (!activeWorkspace) {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <EmptyState
          title="Choose a workspace"
          description="Select a workspace before managing its members and access."
          action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>}
        />
      </div>
    );
  }

  const canManage = workspaceCan(activeWorkspace, 'member:manage');

  const tabs = [
    {
      id: 'members',
      label: 'Members',
      content: <MembersPanel key={activeWorkspace.id} workspace={activeWorkspace} canManage={canManage} onAccessChanged={retry} />,
    },
    ...(canManage ? [
      {
        id: 'invitations',
        label: 'Invitations',
        content: <InvitationsPanel key={activeWorkspace.id} workspace={activeWorkspace} canManage={canManage} />,
      },
      {
        id: 'requests',
        label: 'Join requests',
        content: <JoinRequestsPanel key={activeWorkspace.id} workspace={activeWorkspace} canManage={canManage} />,
      },
    ] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8">
      <PageHeader
        title="Members and access"
        description={`Manage who belongs to ${activeWorkspace.name}, invite people, and review join requests. Your role and the backend determine which actions are available.`}
      />
      {!canManage && (
        <Card className="p-5 sm:p-7">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You can view the member list. Only the owner and administrators can invite people, change roles, or review join requests.
          </p>
        </Card>
      )}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
