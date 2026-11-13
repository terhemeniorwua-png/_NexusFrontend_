import { describe, expect, it } from 'vitest';
import { resolveAvatarUrl } from '../avatar';

describe('resolveAvatarUrl', () => {
  it('returns null for empty values', () => {
    expect(resolveAvatarUrl(null)).toBeNull();
    expect(resolveAvatarUrl('')).toBeNull();
  });
  it('rewrites API paths to the proxy', () => {
    expect(resolveAvatarUrl('/api/v1/users/me/avatar')).toBe('/api/backend/users/me/avatar');
  });
  it('leaves absolute, blob and data URLs alone', () => {
    expect(resolveAvatarUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(resolveAvatarUrl('blob:https://x/abc')).toBe('blob:https://x/abc');
    expect(resolveAvatarUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
  });
});
