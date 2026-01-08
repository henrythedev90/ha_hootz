/**
 * Mock for Redis client
 *
 * This provides a simple in-memory mock for Redis operations.
 * Use this when testing functions that interact with Redis.
 *
 * Example usage:
 * ```typescript
 * jest.mock('@/lib/redis/client', () => ({
 *   getRedis: jest.fn(() => mockRedisClient),
 * }));
 * ```
 */

// In-memory storage to simulate Redis
const storage = new Map<string, string>();
const hashStorage = new Map<string, Map<string, string>>();
const sortedSetStorage = new Map<string, Map<string, number>>();

export const mockRedisClient = {
  // String operations
  get: jest.fn((key: string) => Promise.resolve(storage.get(key) || null)),
  set: jest.fn((key: string, value: string) => {
    storage.set(key, value);
    return Promise.resolve("OK");
  }),
  del: jest.fn((key: string) => {
    const existed = storage.has(key);
    storage.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  }),

  // Hash operations
  hGet: jest.fn((key: string, field: string) => {
    const hash = hashStorage.get(key);
    return Promise.resolve(hash?.get(field) || null);
  }),
  hSet: jest.fn((key: string, field: string, value: string) => {
    if (!hashStorage.has(key)) {
      hashStorage.set(key, new Map());
    }
    hashStorage.get(key)!.set(field, value);
    return Promise.resolve(1);
  }),
  hGetAll: jest.fn((key: string) => {
    const hash = hashStorage.get(key);
    if (!hash) return Promise.resolve({});
    const result: Record<string, string> = {};
    hash.forEach((value, field) => {
      result[field] = value;
    });
    return Promise.resolve(result);
  }),
  hDel: jest.fn((key: string, field: string) => {
    const hash = hashStorage.get(key);
    if (hash?.has(field)) {
      hash.delete(field);
      return Promise.resolve(1);
    }
    return Promise.resolve(0);
  }),

  // Sorted set operations
  zIncrBy: jest.fn((key: string, increment: number, member: string) => {
    if (!sortedSetStorage.has(key)) {
      const set = new Map<string, number>();
      set.set(member, increment);
      sortedSetStorage.set(key, set);
      return Promise.resolve(increment);
    } else {
      const set = sortedSetStorage.get(key)!;
      const current = set.get(member) || 0;
      set.set(member, current + increment);
      return Promise.resolve(current + increment);
    }
  }),
  zScore: jest.fn((key: string, member: string) => {
    const set = sortedSetStorage.get(key);
    return Promise.resolve(set?.get(member) || null);
  }),

  // Utility methods for testing
  clear: () => {
    storage.clear();
    hashStorage.clear();
    sortedSetStorage.clear();
  },
};

// Default export for compatibility
export default mockRedisClient;

