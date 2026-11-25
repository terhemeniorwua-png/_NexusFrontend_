import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from '@/lib/safe-url';

describe('safeExternalUrl', () => {
  it('accepts http and https URLs', () => {
    expect(safeExternalUrl('https://example.com/art.png')).toBe('https://example.com/art.png');
    expect(safeExternalUrl('http://example.com/path?q=1')).toBe('http://example.com/path?q=1');
  });

  it('rejects unsafe or invalid values', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalUrl('file:///etc/passwd')).toBeNull();
    expect(safeExternalUrl('ftp://example.com/file')).toBeNull();
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl('not a url')).toBeNull();
    expect(safeExternalUrl('https://example.com has spaces')).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });
});
