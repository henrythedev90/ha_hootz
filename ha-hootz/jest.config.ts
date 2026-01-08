import type { Config } from "jest";
import nextJest from "next/jest";

/**
 * Jest configuration for Ha-Hootz
 *
 * Uses next/jest to handle Next.js-specific transformations:
 * - CSS imports
 * - Image imports
 * - App Router path aliases
 * - TypeScript compilation
 */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

const config: Config = {
  // Use jsdom environment for React component testing
  // This provides browser-like APIs (window, document, etc.)
  testEnvironment: "jsdom",

  // Setup files run before each test file
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Module path aliases matching tsconfig.json
  // Allows imports like @/lib, @/components to work in tests
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Handle CSS imports (Next.js handles these, but Jest needs to mock them)
    "^.+\\.(css|sass|scss)$": "identity-obj-proxy",
    // Handle image imports
    "^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$":
      "<rootDir>/__mocks__/fileMock.js",
  },

  // Test file patterns
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],

  // Files to ignore
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/out/", "/build/"],

  // Note: next/jest handles TypeScript transformation automatically
  // No need to configure transform manually

  // Coverage configuration
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
  ],

  // Clear mocks between tests to prevent test pollution
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,
};

export default createJestConfig(config);
