import type { Metadata } from 'next';
import { AuthenticatedShell } from '@/components/layout/AuthenticatedShell';
import { AvatarUrlProvider } from '@/providers/AvatarUrlProvider';
import { SocketProvider } from '@/providers/SocketProvider';
import { WorkspaceProvider } from '@/providers/WorkspaceProvider';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AvatarUrlProvider>
        <SocketProvider>
          <AuthenticatedShell>{children}</AuthenticatedShell>
        </SocketProvider>
      </AvatarUrlProvider>
    </WorkspaceProvider>
  );
}
