import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/AuthPage';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <AuthPage mode="forgot-password" />; }
