import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from '../api-base-url';

const DEV = true;
const PROD = false;

describe('resolveApiBaseUrl', () => {
  // -------------------------------------------------------------------------
  // Single clean URL
  // -------------------------------------------------------------------------

  it('returns a single clean URL unchanged', () => {
    expect(resolveApiBaseUrl('http://localhost:4000/api/v1', DEV)).toBe(
      'http://localhost:4000/api/v1',
    );
  });

  it('strips a trailing slash', () => {
    expect(resolveApiBaseUrl('http://localhost:4000/api/v1/', DEV)).toBe(
      'http://localhost:4000/api/v1',
    );
  });

  it('strips multiple trailing slashes', () => {
    expect(resolveApiBaseUrl('http://localhost:4000/api/v1///', DEV)).toBe(
      'http://localhost:4000/api/v1',
    );
  });

  // -------------------------------------------------------------------------
  // Comma-separated pair — the original production bug
  // -------------------------------------------------------------------------

  it('picks the first URL from a comma-separated pair (dev)', () => {
    const raw = 'http://localhost:4000/api/v1, http://localhost:4000/api/v1';
    expect(resolveApiBaseUrl(raw, DEV)).toBe('http://localhost:4000/api/v1');
  });

  it('picks the first URL from a comma-separated pair without space (dev)', () => {
    const raw = 'http://localhost:4000/api/v1,http://backup:4000/api/v1';
    expect(resolveApiBaseUrl(raw, DEV)).toBe('http://localhost:4000/api/v1');
  });

  // -------------------------------------------------------------------------
  // Whitespace handling
  // -------------------------------------------------------------------------

  it('trims leading and trailing whitespace from the URL', () => {
    expect(resolveApiBaseUrl('  http://localhost:4000/api/v1  ', DEV)).toBe(
      'http://localhost:4000/api/v1',
    );
  });

  it('trims whitespace around comma-separated values', () => {
    const raw = '  http://primary:4000/api/v1  ,  http://secondary:4000/api/v1  ';
    expect(resolveApiBaseUrl(raw, DEV)).toBe('http://primary:4000/api/v1');
  });

  // -------------------------------------------------------------------------
  // Missing /api/v1 suffix
  // -------------------------------------------------------------------------

  it('appends /api/v1 when the URL has no path', () => {
    expect(resolveApiBaseUrl('http://localhost:4000', DEV)).toBe(
      'http://localhost:4000/api/v1',
    );
  });

  it('appends /api/v1 when the URL has a different path', () => {
    expect(resolveApiBaseUrl('http://localhost:4000/backend', DEV)).toBe(
      'http://localhost:4000/backend/api/v1',
    );
  });

  // -------------------------------------------------------------------------
  // Duplicate /api/v1 — must not double it
  // -------------------------------------------------------------------------

  it('does not double /api/v1 when already present', () => {
    expect(resolveApiBaseUrl('http://localhost:4000/api/v1', DEV)).toBe(
      'http://localhost:4000/api/v1',
    );
    expect(resolveApiBaseUrl('http://localhost:4000/api/v1/', DEV)).toBe(
      'http://localhost:4000/api/v1',
    );
  });

  // -------------------------------------------------------------------------
  // Empty / missing value — dev fallback
  // -------------------------------------------------------------------------

  it('falls back to localhost in development when value is empty', () => {
    expect(resolveApiBaseUrl('', DEV)).toBe('http://localhost:4000/api/v1');
    expect(resolveApiBaseUrl(undefined, DEV)).toBe('http://localhost:4000/api/v1');
    expect(resolveApiBaseUrl('  ', DEV)).toBe('http://localhost:4000/api/v1');
  });

  // -------------------------------------------------------------------------
  // Invalid scheme
  // -------------------------------------------------------------------------

  it('skips non-http(s) candidates and falls back in dev', () => {
    expect(resolveApiBaseUrl('ftp://localhost:4000/api/v1', DEV)).toBe(
      'http://localhost:4000/api/v1',
    );
  });

  it('uses the first valid URL after skipping invalid schemes', () => {
    const raw = 'ftp://bad.example.com/api/v1, http://good.example.com/api/v1';
    expect(resolveApiBaseUrl(raw, DEV)).toBe('http://good.example.com/api/v1');
  });

  // -------------------------------------------------------------------------
  // Production behaviour — must throw instead of guessing
  // -------------------------------------------------------------------------

  it('throws in production when value is empty', () => {
    expect(() => resolveApiBaseUrl('', PROD)).toThrow(/NEXUS_API_URL/);
    expect(() => resolveApiBaseUrl(undefined, PROD)).toThrow(/NEXUS_API_URL/);
  });

  it('throws in production when no valid URL is found', () => {
    expect(() => resolveApiBaseUrl('ftp://bad.example.com/api/v1', PROD)).toThrow(
      /NEXUS_API_URL/,
    );
    expect(() => resolveApiBaseUrl('not-a-url', PROD)).toThrow(/NEXUS_API_URL/);
  });

  it('succeeds in production with a valid HTTPS URL', () => {
    expect(resolveApiBaseUrl('https://api.example.com/api/v1', PROD)).toBe(
      'https://api.example.com/api/v1',
    );
  });

  // -------------------------------------------------------------------------
  // Login URL — no comma or %20 in the final upstream URL
  // -------------------------------------------------------------------------

  it('produces a correct login URL with no comma or encoded space', () => {
    // Simulate the broken value that caused the original bug.
    const raw = 'http://localhost:4000/api/v1, http://localhost:4000/api/v1';
    const base = resolveApiBaseUrl(raw, DEV);
    const loginUrl = `${base}/auth/login`;
    expect(loginUrl).toBe('http://localhost:4000/api/v1/auth/login');
    expect(loginUrl).not.toContain(',');
    expect(loginUrl).not.toContain('%20');
    expect(loginUrl).not.toContain(' ');
  });
});
