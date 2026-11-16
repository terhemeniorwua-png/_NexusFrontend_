// Shared typed helper for test mocks
// Reusable across vitest/playwright test files

import { PrismaClient } from '@prisma/client';

// Minimal Prisma client type for mocking
export type MockPrismaClient = Partial<PrismaClient> & {
  $transaction?: <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
};

// Helper to create a typed mock Prisma client
export function createMockPrismaClient(): MockPrismaClient {
  return {} as MockPrismaClient;
}
