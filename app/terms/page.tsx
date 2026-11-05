import type { Metadata } from 'next';
import { PolicyPage } from '@/components/legal/PolicyPage';
import { legalPolicies } from '@/lib/legal-policies';

export const metadata: Metadata = { title: 'Terms of Service', robots: { index: false, follow: false } };

export default function TermsPage() {
  return <PolicyPage policy={legalPolicies.terms} />;
}
