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
jest.mock("next/image", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: function NextImage(props: any) {
      // Extract Next.js Image specific props that don't apply to regular img
      const {
        fill,
        unoptimized,
        priority,
        quality,
        placeholder,
        blurDataURL,
        loader,
        sizes,
        onLoad,
        onError,
        onLoadingComplete,
        ...imgProps
      } = props;

      // If fill is used, we need to handle it differently
      // For tests, we'll just render a regular img with the src
      if (fill) {
        // Remove width/height if fill is used, as they're not needed
        const { width, height, ...restProps } = imgProps;
        
        // Determine object-fit from className
        let objectFit = "cover";
        if (restProps.className?.includes("object-contain")) {
          objectFit = "contain";
        } else if (restProps.className?.includes("object-fill")) {
          objectFit = "fill";
        } else if (restProps.className?.includes("object-none")) {
          objectFit = "none";
        } else if (restProps.className?.includes("object-scale-down")) {
          objectFit = "scale-down";
        }

        return React.createElement("img", {
          ...restProps,
          style: {
            ...restProps.style,
            width: "100%",
            height: "100%",
            objectFit: objectFit,
            position: "absolute",
          },
        });
      }

      // For non-fill images, use width and height if provided
      return React.createElement("img", {
        ...imgProps,
        // Ensure src is always a string (handles data URLs)
        src: imgProps.src || "",
      });
    },
  };
});

// Suppress console errors/warnings in tests (optional, can be removed if you want to see them)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

