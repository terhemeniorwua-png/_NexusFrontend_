// Shared typed helpers for test files
// This file can be imported in vitest/playwright test files

// Helper for creating typed mock objects
export function assertNever(_: never): void {}

/**
 * Creates a typed mock for Prisma client methods
 * Useful in unit tests where you need to mock specific Prisma methods
 */
export function mockPrismaMethod<T extends Record<string, unknown>>(
  obj: T,
  method: keyof T,
  value: unknown
): T {
  const result = { ...obj } as T;
  ;(result[method] as unknown) = value;
  return result;
}

/**
 * Creates a partial typed object with specified required keys
 */
export function requiredKeys<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return {} as Pick<T, K>;
}
