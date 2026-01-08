# Testing Setup Summary

This document summarizes the unit testing setup for the Ha-Hootz application.

## ✅ Completed Setup

### 1. Dependencies Installed

The following testing dependencies have been added to `package.json`:

- `jest` - Test runner
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Additional Jest matchers for DOM testing
- `@testing-library/user-event` - User interaction simulation
- `jest-environment-jsdom` - Browser environment for tests
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - TypeScript types for Jest
- `identity-obj-proxy` - CSS module mocking

**To install, run:**

```bash
npm install --legacy-peer-deps
```

**Note:** The `--legacy-peer-deps` flag is needed because `@testing-library/react@14.x` has a peer dependency on `react@^18.0.0`, but the project uses React 19. This is safe to ignore - React Testing Library 14.x works perfectly with React 19, the peer dependency metadata just hasn't been updated yet. See `INSTALL_TESTING.md` for more details.

### 2. Configuration Files Created

#### `jest.config.ts`

- Configured for Next.js App Router
- TypeScript support via ts-jest
- jsdom environment for React component testing
- Path alias support (`@/` imports)
- CSS and image import mocking
- Coverage collection configuration

#### `jest.setup.ts`

- React Testing Library DOM matchers
- Next.js router mocking
- Next.js Image component mocking
- Global test configuration

### 3. Mock Files Created

#### `__mocks__/socket.io-client.ts`

- Mocks Socket.io client to prevent real connections
- Provides mock socket object with common methods

#### `__mocks__/redis.ts`

- In-memory Redis mock for testing
- Supports common Redis operations (get, set, hGet, hSet, etc.)
- Includes `clear()` method for test cleanup

#### `__mocks__/fileMock.js`

- Mocks static file imports (images, fonts, etc.)

### 4. Test Scripts Added

Added to `package.json`:

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### 5. Example Test Files Created

#### `lib/scoring/calculateScore.ts`

Pure scoring calculation functions extracted from Redis-dependent code:

- `calculateTimeBonus()` - Calculates time-based bonus
- `calculateStreakBonus()` - Calculates streak-based bonus
- `calculateScore()` - Main scoring function combining all bonuses

#### `lib/scoring/calculateScore.test.ts`

Comprehensive test suite demonstrating:

- ✅ Testing pure functions
- ✅ Testing business rules clearly
- ✅ Testing edge cases
- ✅ Testing combined scenarios
- ✅ Descriptive test names

**Test Coverage:**

- Time bonus calculation (expired, immediate, half-time, rounding)
- Streak bonus calculation (below threshold, at threshold, above threshold, error handling)
- Basic scoring rules (incorrect, unanswered, correct)
- Combined bonuses (time + streak)

#### `store/slices/__tests__/gameSlice.test.ts`

Example reducer tests demonstrating:

- ✅ Testing Redux Toolkit reducers
- ✅ Testing state transitions
- ✅ Testing edge cases (null state, overwrites)

### 6. Documentation Created

#### `README_TESTING.md`

Complete testing guide covering:

- Setup instructions
- Test structure guidelines
- Writing tests for functions, reducers, and components
- Mock usage examples
- Best practices
- Troubleshooting

## 🎯 Key Design Decisions

### Why Pure Functions for Scoring?

The scoring logic was extracted into pure functions (`lib/scoring/calculateScore.ts`) because:

1. **Testability** - Pure functions are easy to test (no side effects)
2. **Reusability** - Can be used in different contexts
3. **Maintainability** - Clear separation of concerns
4. **Type Safety** - Full TypeScript support

### Why jsdom Environment?

jsdom provides browser-like APIs (window, document, etc.) without requiring a real browser:

- Fast test execution
- Works in CI/CD environments
- Sufficient for React component testing

### Why Mock Socket.io and Redis?

External dependencies are mocked to:

- **Speed** - Tests run faster without real connections
- **Reliability** - Tests don't depend on external services
- **Isolation** - Each test is independent
- **Control** - Easy to simulate different scenarios

### Why No Snapshot Testing?

Following best practices:

- Snapshot tests are brittle and break on minor changes
- They test implementation details, not behavior
- They're hard to maintain and review
- Prefer explicit assertions that test business rules

## 📁 File Structure

```
ha-hootz/
├── jest.config.ts                 # Jest configuration
├── jest.setup.ts                  # Test setup file
├── __mocks__/
│   ├── fileMock.js                # Static file mock
│   ├── redis.ts                   # Redis client mock
│   └── socket.io-client.ts        # Socket.io mock
├── lib/
│   └── scoring/
│       ├── calculateScore.ts      # Pure scoring functions
│       └── calculateScore.test.ts # Scoring tests
├── store/
│   └── slices/
│       └── __tests__/
│           └── gameSlice.test.ts  # Reducer tests
├── README_TESTING.md              # Testing guide
└── TESTING_SETUP.md               # This file
```

## 🚀 Next Steps

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run tests:**

   ```bash
   npm test
   ```

3. **Write more tests:**

   - Add tests for other reducers (hostSlice, playerSlice)
   - Add tests for utility functions
   - Add tests for simple components (buttons, toggles)

4. **Follow the patterns:**
   - Use `calculateScore.test.ts` as a template for function tests
   - Use `gameSlice.test.ts` as a template for reducer tests
   - See `README_TESTING.md` for component testing examples

## 📝 Notes

- All tests use TypeScript for type safety
- Tests follow the "test behavior, not implementation" principle
- Business rules are clearly described in test names
- Mocks are provided for external dependencies
- No snapshot testing is used

## 🔍 Verification

To verify the setup works:

```bash
# Install dependencies
npm install

# Run the example tests
npm test

# You should see:
# ✓ calculateTimeBonus tests
# ✓ calculateStreakBonus tests
# ✓ calculateScore tests
# ✓ gameSlice reducer tests
```

All tests should pass, demonstrating that the testing environment is properly configured.
