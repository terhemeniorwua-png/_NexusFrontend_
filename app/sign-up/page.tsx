import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/AuthPage';

export const metadata: Metadata = { title: 'Create account', robots: { index: false, follow: false } };
export default function SignUpPage() { return <AuthPage mode="sign-up" />; }
