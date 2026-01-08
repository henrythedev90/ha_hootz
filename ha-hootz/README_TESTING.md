# Testing Guide for Ha-Hootz

This document explains the testing setup and how to write tests for the Ha-Hootz application.

## Setup

The testing environment uses:
- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **ts-jest** - TypeScript support for Jest
- **jsdom** - Browser environment simulation

## Installation

After cloning the repository, install dependencies:

```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests should be placed:
- Next to the file they test: `calculateScore.test.ts` next to `calculateScore.ts`
- Or in a `__tests__` directory: `__tests__/calculateScore.test.ts`

## Writing Tests

### Testing Pure Functions

Pure functions (no side effects) are the easiest to test. Example:

```typescript
import { calculateScore } from './calculateScore';

describe('calculateScore', () => {
  it('should return base points for correct answer', () => {
    const config = { basePoints: 100, ... };
    const score = calculateScore('A', 'A', config);
    expect(score).toBe(100);
  });
});
```

### Testing Reducers

Redux Toolkit reducers are pure functions and can be tested directly:

```typescript
import { gameSlice } from '@/store/slices/gameSlice';

describe('gameSlice', () => {
  it('should set question when START_QUESTION action is dispatched', () => {
    const initialState = { gameState: null };
    const action = {
      type: 'game/startQuestion',
      payload: { question: {...}, questionIndex: 0 }
    };
    const newState = gameSlice.reducer(initialState, action);
    expect(newState.gameState?.question).toBeDefined();
  });
});
```

### Testing Components

Use React Testing Library to test component behavior, not implementation:

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('should call onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Mocks

### Socket.io

Socket.io is automatically mocked. To use in tests:

```typescript
import { io } from 'socket.io-client';

jest.mock('socket.io-client');

// In your test
const mockSocket = io() as jest.Mocked<ReturnType<typeof io>>;
expect(mockSocket.emit).toHaveBeenCalledWith('event-name', data);
```

### Redis

Redis is mocked with an in-memory implementation:

```typescript
import { mockRedisClient } from '@/__mocks__/redis';

// Clear storage between tests
beforeEach(() => {
  mockRedisClient.clear();
});

// Use mockRedisClient in your tests
await mockRedisClient.set('key', 'value');
const value = await mockRedisClient.get('key');
```

### Next.js Router

The Next.js router is automatically mocked in `jest.setup.ts`. Components using `useRouter()` will work without additional setup.

## Best Practices

1. **Test behavior, not implementation**
   - ✅ Test that clicking a button calls a function
   - ❌ Don't test that a specific internal method was called

2. **Use descriptive test names**
   - ✅ `should return 0 points for incorrect answer`
   - ❌ `test1` or `works correctly`

3. **Test business rules clearly**
   - ✅ `should award streak bonus when player reaches threshold of 3`
   - ❌ `should calculate bonus correctly`

4. **Keep tests isolated**
   - Each test should be independent
   - Use `beforeEach`/`afterEach` to set up/tear down state

5. **Avoid snapshot testing**
   - Snapshot tests are brittle and don't test behavior
   - Prefer testing specific outcomes

6. **Mock external dependencies**
   - Don't make real API calls
   - Don't connect to real databases
   - Use mocks for Socket.io, Redis, etc.

## Example: Testing Scoring Logic

See `lib/scoring/calculateScore.test.ts` for a complete example of testing game logic:

- Tests for time bonus calculation
- Tests for streak bonus calculation
- Tests for combined scoring scenarios
- Tests for edge cases (expired time, below thresholds, etc.)

## Configuration Files

- `jest.config.ts` - Main Jest configuration
- `jest.setup.ts` - Setup file that runs before each test
- `__mocks__/` - Directory containing mock implementations

## Troubleshooting

### Tests fail with "Cannot find module"

Make sure path aliases are correctly configured in `jest.config.ts`. The `@/` alias should map to `<rootDir>/`.

### Component tests fail with "useRouter is not defined"

The Next.js router is mocked in `jest.setup.ts`. If you're still seeing errors, make sure `jest.setup.ts` is listed in `jest.config.ts` under `setupFilesAfterEnv`.

### TypeScript errors in test files

Make sure `@types/jest` is installed and your `tsconfig.json` includes test files.

