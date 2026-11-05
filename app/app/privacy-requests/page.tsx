import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';

const requestTypes = [
  ['Access', 'Request a copy or review of personal information held in Nexus.'],
  ['Correction', 'Request correction of inaccurate personal information.'],
  ['Erasure or redaction', 'Ask Nexus to review personal information in retained collaboration content.'],
] as const;

export default function PrivacyRequestsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8 sm:px-8">
      <header>
        <Link href="/app/profile" className="text-sm font-medium text-[var(--color-primary)] hover:underline">← Back to profile</Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Privacy requests</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">Shared collaboration history is retained when an account is deleted. A request can ask us to review personal information while protecting other people’s information and legitimate workspace records.</p>
      </header>
      <Alert variant="warning" title="Request submission is not available yet">The backend does not currently provide privacy-request submission, status, decision, or review endpoints. This page does not send or store a request. Contact details and response timelines are pending legal review.</Alert>
      <section aria-label="Privacy request types" className="grid gap-4 sm:grid-cols-3">
        {requestTypes.map(([title, description]) => <Card key={title} className="p-5"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p></Card>)}
      </section>
      <Card className="p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Retained content is reviewed, not automatically removed</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">Messages, comments, tasks and project updates remain available under existing access controls. Deleted authors appear as “Deleted user.” This does not mean every personal detail inside the content has been erased. Nexus will not automatically delete collaboration history in response to account deletion.</p>
      </Card>
    </main>
  );
}
