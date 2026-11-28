import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beginGoogleOAuth, clearGoogleOAuthIntent, readGoogleOAuthIntent } from '@/lib/google-oauth';

describe('Google OAuth browser intent', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
    // Default: a valid backend origin in development mode
    vi.stubEnv('NEXT_PUBLIC_BACKEND_ORIGIN', 'https://backend.example.test');
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('stores only non-secret onboarding context and navigates to the backend origin', () => {
    const navigate = vi.fn();

    beginGoogleOAuth(
      {
        mode: 'sign-up',
        accountType: 'business',
        redirectPath: '/app/projects?welcome=true',
      },
      navigate,
    );

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

  // ---------------------------------------------------------------------------
  // resolveBackendOrigin behaviour exercised through beginGoogleOAuth
  // ---------------------------------------------------------------------------

  it('strips a trailing slash from the origin', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_ORIGIN', 'https://backend.example.test/');
    const navigate = vi.fn();

    beginGoogleOAuth({ mode: 'sign-in' }, navigate);

    expect(navigate).toHaveBeenCalledWith('https://backend.example.test/api/v1/auth/google');
  });

  it('picks the first valid URL from a comma-separated pair', () => {
    vi.stubEnv(
      'NEXT_PUBLIC_BACKEND_ORIGIN',
      'https://primary.example.test, https://secondary.example.test',
    );
    const navigate = vi.fn();

    beginGoogleOAuth({ mode: 'sign-in' }, navigate);

    expect(navigate).toHaveBeenCalledWith('https://primary.example.test/api/v1/auth/google');
  });

  it('strips a trailing /api/v1 suffix if the env value includes it', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_ORIGIN', 'https://backend.example.test/api/v1');
    const navigate = vi.fn();

    beginGoogleOAuth({ mode: 'sign-in' }, navigate);

    // /api/v1 must not be doubled
    expect(navigate).toHaveBeenCalledWith('https://backend.example.test/api/v1/auth/google');
  });

  it('falls back to http://localhost:4000 in development when the value is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_ORIGIN', '');
    vi.stubEnv('NODE_ENV', 'development');
    const navigate = vi.fn();

    beginGoogleOAuth({ mode: 'sign-in' }, navigate);

    expect(navigate).toHaveBeenCalledWith('http://localhost:4000/api/v1/auth/google');
  });

  it('throws in production when NEXT_PUBLIC_BACKEND_ORIGIN is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_ORIGIN', '');
    vi.stubEnv('NODE_ENV', 'production');
    const navigate = vi.fn();

    expect(() => beginGoogleOAuth({ mode: 'sign-in' }, navigate)).toThrow(
      /NEXT_PUBLIC_BACKEND_ORIGIN/,
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('throws in production when the value is not a valid http(s) URL', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_ORIGIN', 'ftp://bad.example.com');
    vi.stubEnv('NODE_ENV', 'production');
    const navigate = vi.fn();

    expect(() => beginGoogleOAuth({ mode: 'sign-in' }, navigate)).toThrow(
      /NEXT_PUBLIC_BACKEND_ORIGIN/,
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('never uses the old hardcoded onrender.com fallback', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_ORIGIN', 'https://backend.example.test');
    const navigate = vi.fn();

    beginGoogleOAuth({ mode: 'sign-in' }, navigate);

    expect(String(navigate.mock.calls[0]?.[0])).not.toContain('onrender.com');
  });
});
