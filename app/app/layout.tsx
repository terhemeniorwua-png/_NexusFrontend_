import type { Metadata } from 'next';
import { AuthenticatedShell } from '@/components/layout/AuthenticatedShell';
import { WorkspaceProvider } from '@/providers/WorkspaceProvider';
import { SocketProvider } from '@/providers/SocketProvider';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <SocketProvider>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </SocketProvider>
    </WorkspaceProvider>
  );
}
