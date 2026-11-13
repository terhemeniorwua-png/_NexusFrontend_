export function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  return url.replace(/^\/api\/v1\//, '/api/backend/');
}
