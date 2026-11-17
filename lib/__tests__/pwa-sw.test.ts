import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('PWA service worker', () => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  const source = readFileSync(swPath, 'utf8');

  it('does not cache /api/backend requests', () => {
    // Must explicitly detect backend/API requests and bypass caching logic.
    expect(source).toContain("/api/backend");
    expect(source).toContain("url.pathname.startsWith('/api/backend')");
    expect(source).toContain("url.pathname.startsWith('/api/')");

    // The fetch handler must return without caching API/backend requests.
    expect(source).toMatch(/if\s*\(isApiOrBackendRequest\(url\)\)\s*\{[\s\S]*?return;[\s\S]*?\}/);

    // Must state/implement that authenticated data and API responses are never cached.
    expect(source).toMatch(/Never caches .*\/api\/backend/i);
    expect(source).toMatch(/never caches .*api responses/i);
  });

  it('provides an offline fallback and caches only shell/static assets', () => {
    expect(source).toContain("const OFFLINE_URL = '/offline'");
    expect(source).toContain('PRECACHE_URLS');
    expect(source).toContain('/_next/static/');
    expect(source).toContain("request.mode === 'navigate'");
  });
});
