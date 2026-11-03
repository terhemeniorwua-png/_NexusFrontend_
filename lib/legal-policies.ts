export interface LegalPolicySection {
  id: string;
  heading: string;
}

export interface LegalPolicyContent {
  title: string;
  summary: string;
  approvalState: 'awaiting-approved-content';
  sections: LegalPolicySection[];
}

/** Replace section placeholders with approved text without changing page routes or layout. */
export const legalPolicies: Record<'terms' | 'privacy', LegalPolicyContent> = {
  terms: {
    title: 'Terms of Service',
    summary: 'Approved Terms of Service content has not been provided. This page is a clearly marked placeholder, not approved legal text.',
    approvalState: 'awaiting-approved-content',
    sections: [
      { id: 'eligibility', heading: 'Eligibility and accounts' },
      { id: 'service', heading: 'Using the Nexus service' },
      { id: 'content', heading: 'User content and workspace activity' },
      { id: 'plans', heading: 'Plans, trials, and billing' },
      { id: 'availability', heading: 'Service availability and account closure' },
      { id: 'contact', heading: 'Contact information' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    summary: 'Approved Privacy Policy content has not been provided. This page is a clearly marked placeholder, not approved legal text.',
    approvalState: 'awaiting-approved-content',
    sections: [
      { id: 'information', heading: 'Information and data handled by Nexus' },
      { id: 'use', heading: 'How information is used' },
      { id: 'sharing', heading: 'Sharing and service providers' },
      { id: 'retention', heading: 'Storage and retention' },
      { id: 'choices', heading: 'Your choices and requests' },
      { id: 'contact', heading: 'Contact information' },
    ],
  },
};
