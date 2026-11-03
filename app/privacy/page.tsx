import type { Metadata } from 'next';
import { PolicyPage } from '@/components/legal/PolicyPage';
import { legalPolicies } from '@/lib/legal-policies';

export const metadata: Metadata = { title: 'Privacy Policy', robots: { index: false, follow: false } };

export default function PrivacyPage() {
  return <PolicyPage policy={legalPolicies.privacy} />;
}
