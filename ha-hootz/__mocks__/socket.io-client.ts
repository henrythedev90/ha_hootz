/**
 * Mock for socket.io-client
 *
 * This mock prevents real socket connections during tests.
 * Use this in tests that involve components using socket.io.
 *
 * Example usage:
 * ```typescript
 * import { io } from 'socket.io-client';
 * const mockSocket = io as jest.MockedFunction<typeof io>;
 * ```
 */

export const io = jest.fn(() => ({
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  connected: true,
  id: "mock-socket-id",
}));

export default io;

