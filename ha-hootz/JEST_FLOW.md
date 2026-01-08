# Jest Test Execution Flow

This document explains how Jest runs tests in the Ha-Hootz project.

## Overview

Jest is a JavaScript testing framework that runs tests in a Node.js environment. Here's how it works:

## 1. Test Discovery Phase

When you run `npm test` (which runs `jest`), Jest:

1. **Scans for test files** using patterns defined in `jest.config.ts`:
   ```typescript
   testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"]
   ```
   - Looks for files in `__tests__` directories
   - Looks for files ending in `.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`

2. **Finds test files**:
   - `lib/scoring/calculateScore.test.ts`
   - `store/slices/__tests__/gameSlice.test.ts`

## 2. Configuration Loading

Jest loads configuration from `jest.config.ts`:

```typescript
const createJestConfig = nextJest({ dir: "./" });
const config = {
  testEnvironment: "jsdom",        // Browser-like environment
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],  // Runs before each test
  moduleNameMapper: { ... },        // Path aliases (@/ → root)
  // ... other config
};
```

## 3. Setup Phase (Before All Tests)

Before running any tests, Jest executes `jest.setup.ts`:

```typescript
// jest.setup.ts runs ONCE before all test files

// 1. Extend Jest matchers
import "@testing-library/jest-dom";
// Adds: toBeInTheDocument(), toHaveTextContent(), etc.

// 2. Mock Next.js router
jest.mock("next/navigation", () => ({ ... }));

// 3. Mock Next.js Image component
jest.mock("next/image", () => ({ ... }));
```

**Key Point**: `jest.setup.ts` runs **once** before all tests, not before each test.

## 4. Test File Execution

For each test file, Jest:

### 4.1 Module Resolution

1. **Resolves imports** using `moduleNameMapper`:
   ```typescript
   "^@/(.*)$": "<rootDir>/$1"
   ```
   - `@/lib/scoring` → `lib/scoring`
   - `@/components` → `components`

2. **Transforms TypeScript** using `next/jest`:
   - Converts `.ts`/`.tsx` to JavaScript
   - Handles Next.js-specific syntax

3. **Mocks external modules**:
   - `next/image` → Uses mock from `jest.setup.ts`
   - `next/navigation` → Uses mock from `jest.setup.ts`
   - CSS files → Uses `identity-obj-proxy`
   - Image files → Uses `__mocks__/fileMock.js`

### 4.2 Test Execution Order

```typescript
// Example: calculateScore.test.ts

describe("calculateTimeBonus", () => {
  // Jest runs tests in order, but can be parallelized
  
  it("should return 0 when time has expired", () => {
    // 1. Jest creates a fresh test context
    // 2. Executes the test function
    // 3. Runs assertions
    // 4. Cleans up (if clearMocks: true)
  });
  
  it("should return maximum bonus...", () => {
    // Same process for each test
  });
});
```

### 4.3 Test Isolation

Each test runs in isolation:
- **Fresh state** (unless shared via `beforeEach`)
- **Mocks are reset** (if `clearMocks: true` and `restoreMocks: true`)
- **No side effects** between tests

## 5. Mock System

Jest's mock system works in layers:

### 5.1 Module Mocks (from jest.setup.ts)

```typescript
// jest.setup.ts
jest.mock("next/image", () => ({
  default: (props) => React.createElement("img", props)
}));
```

**When**: Created once during setup
**Scope**: Global - affects all test files
**Lifetime**: Persists across all tests

### 5.2 Manual Mocks (__mocks__ directory)

```typescript
// __mocks__/socket.io-client.ts
export const io = jest.fn(() => mockSocket);
```

**When**: Automatically used when module is imported
**Scope**: Per test file
**Lifetime**: Reset between tests (if configured)

### 5.3 Inline Mocks (in test files)

```typescript
// In a test file
jest.mock("./someModule", () => ({
  someFunction: jest.fn()
}));
```

**When**: Created when test file loads
**Scope**: Only that test file
**Lifetime**: Reset between tests

## 6. Assertion Phase

Jest uses matchers to verify expectations:

```typescript
expect(actual).toBe(expected);        // Strict equality (===)
expect(actual).toEqual(expected);      // Deep equality
expect(actual).toBeInTheDocument();   // From @testing-library/jest-dom
```

## 7. Reporting Phase

After all tests run:

```
Test Suites: 2 passed, 2 total
Tests:       33 passed, 33 total
Time:        1.421 s
```

## Common Issues & Solutions

### Issue 1: "Cannot read properties of undefined"

**Problem**: Module not exported correctly
```typescript
// ❌ Bad
const gameSlice = createSlice({ ... });
export default gameSlice.reducer;  // Only exports reducer

// ✅ Good
export { gameSlice };  // Export the slice object
export default gameSlice.reducer;
```

**Solution**: Export what tests need to import

### Issue 2: Test expectations don't match implementation

**Problem**: Test calculation is wrong
```typescript
// ❌ Wrong
const submissionTime = 5000;  // Actually gives 0.6 ratio, not 0.5
expect(bonus).toBe(17);  // Fails, gets 20

// ✅ Correct
const submissionTime = 6000;  // Half time remaining
expect(bonus).toBe(17);  // Passes
```

**Solution**: Verify test calculations match actual function logic

### Issue 3: Mocks not working

**Problem**: Mock not set up correctly
```typescript
// ❌ Bad - Mock in wrong place
// In test file, but after imports
import { Image } from "next/image";
jest.mock("next/image");  // Too late!

// ✅ Good - Mock in jest.setup.ts
// Runs before any imports
```

**Solution**: Put global mocks in `jest.setup.ts`

## Execution Timeline

```
┌─────────────────────────────────────────┐
│ 1. npm test                              │
│    └─> jest                              │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 2. Load jest.config.ts                  │
│    └─> Configure test environment        │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 3. Run jest.setup.ts                    │
│    └─> Set up global mocks               │
│    └─> Extend matchers                   │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 4. Discover test files                   │
│    ├─> calculateScore.test.ts           │
│    └─> gameSlice.test.ts                 │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 5. For each test file:                   │
│    ├─> Transform TypeScript             │
│    ├─> Resolve imports                   │
│    ├─> Apply mocks                      │
│    └─> Execute tests                     │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 6. Report results                        │
│    └─> Show pass/fail for each test     │
└─────────────────────────────────────────┘
```

## Key Takeaways

1. **Setup runs once**: `jest.setup.ts` runs before all tests
2. **Tests run in isolation**: Each test gets a fresh environment
3. **Mocks are global**: Mocks in `jest.setup.ts` affect all tests
4. **TypeScript is transformed**: Jest converts TS to JS automatically
5. **Path aliases work**: `@/` imports are resolved via `moduleNameMapper`

## Debugging Tips

1. **See what Jest is doing**:
   ```bash
   npm test -- --verbose
   ```

2. **Run specific test file**:
   ```bash
   npm test calculateScore.test.ts
   ```

3. **Run tests in watch mode**:
   ```bash
   npm run test:watch
   ```

4. **Check coverage**:
   ```bash
   npm run test:coverage
   ```
