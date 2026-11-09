import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beginGoogleOAuth, clearGoogleOAuthIntent, readGoogleOAuthIntent } from '@/lib/google-oauth';

describe('Google OAuth browser intent', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    // OAuth must start on the backend origin so the state cookie is written to
    // the host Google redirects back to.
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN = 'https://backend.example.test';
  });

  it('stores only non-secret onboarding context and navigates to the backend origin', () => {
    const navigate = vi.fn();

    beginGoogleOAuth({
      mode: 'sign-up',
      accountType: 'business',
      redirectPath: '/app/projects?welcome=true',
    }, navigate);

    expect(navigate).toHaveBeenCalledWith('https://backend.example.test/api/v1/auth/google');
    expect(readGoogleOAuthIntent()).toEqual({
      mode: 'sign-up',
      accountType: 'business',
      redirectPath: '/app/projects?welcome=true',
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.getItem('nexus-google-oauth-intent')).not.toContain('code');
    expect(window.sessionStorage.getItem('nexus-google-oauth-intent')).not.toContain('password');
  });

  it('rejects an unsafe post-login redirect and clears the intent', () => {
    const navigate = vi.fn();
    beginGoogleOAuth({ mode: 'sign-in', redirectPath: 'https://example.com' }, navigate);

    expect(readGoogleOAuthIntent()).toEqual({ mode: 'sign-in' });
    clearGoogleOAuthIntent();
    expect(readGoogleOAuthIntent()).toBeNull();
  });
});
