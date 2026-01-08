/**
 * Jest setup file
 *
 * This file runs before each test file and sets up:
 * - Testing Library matchers (@testing-library/jest-dom)
 * - Global mocks for external dependencies
 * - Test environment configuration
 */

// Extend Jest matchers with React Testing Library DOM matchers
// This adds matchers like toBeInTheDocument(), toHaveTextContent(), etc.
import "@testing-library/jest-dom";

// Mock Next.js router
// Prevents "useRouter" from throwing errors in components that use it
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image component
// Prevents image optimization from running in tests
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    // Using React.createElement instead of JSX to avoid needing .tsx extension
    const React = require("react");
    return React.createElement("img", props);
  },
}));

// Suppress console errors/warnings in tests (optional, can be removed if you want to see them)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

