import type { Metadata } from 'next';
import { WorkspaceProvider } from '@/providers/WorkspaceProvider';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
