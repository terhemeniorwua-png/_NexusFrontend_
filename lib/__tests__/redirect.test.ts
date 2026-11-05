import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '../redirect';

describe('safeRedirectPath', () => {
  it('accepts same-origin paths', () => {
    expect(safeRedirectPath('/app')).toBe('/app');
    expect(safeRedirectPath('/workspaces/invitations/accept?token=abc_-123')).toBe('/workspaces/invitations/accept?token=abc_-123');
    expect(safeRedirectPath('  /app/profile  ')).toBe('/app/profile');
  });

  it('rejects absolute and protocol-relative targets', () => {
    expect(safeRedirectPath('https://example.com')).toBeNull();
    expect(safeRedirectPath('//example.com')).toBeNull();
    expect(safeRedirectPath('/\\example.com')).toBeNull();
    expect(safeRedirectPath('javascript:alert(1)')).toBeNull();
    expect(safeRedirectPath('app')).toBeNull();
  });

  it('rejects the API proxy and empty values', () => {
    expect(safeRedirectPath('/api/backend/workspaces')).toBeNull();
    expect(safeRedirectPath('/api?path=workspaces')).toBeNull();
    expect(safeRedirectPath('')).toBeNull();
    expect(safeRedirectPath(undefined)).toBeNull();
    expect(safeRedirectPath(null)).toBeNull();
  });
});
