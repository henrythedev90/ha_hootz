# Installing Testing Dependencies

## React 19 Compatibility Note

The project uses **React 19.2.1**, but `@testing-library/react@14.x` has a peer dependency on `react@^18.0.0`. 

**This is safe to ignore** - React Testing Library 14.x works perfectly with React 19, the peer dependency metadata just hasn't been updated yet.

## Installation

Run one of these commands:

### Option 1: Use --legacy-peer-deps (Recommended)

```bash
npm install --legacy-peer-deps
```

This tells npm to install packages even if peer dependencies don't match exactly. This is safe because React Testing Library 14.x is compatible with React 19.

### Option 2: Use --force

```bash
npm install --force
```

This forces npm to install despite conflicts. Use if `--legacy-peer-deps` doesn't work.

### Option 3: Install testing dependencies separately

```bash
npm install --save-dev --legacy-peer-deps \
  jest@^29.7.0 \
  @testing-library/react@^14.2.1 \
  @testing-library/jest-dom@^6.1.5 \
  @testing-library/user-event@^14.5.1 \
  jest-environment-jsdom@^29.7.0 \
  ts-jest@^29.1.2 \
  @types/jest@^29.5.11 \
  identity-obj-proxy@^3.0.0
```

## Why This Happens

React 19 was released recently, and some packages haven't updated their peer dependency declarations yet. React Testing Library 14.x is fully compatible with React 19, so this is just a metadata issue.

## Verify Installation

After installing, verify everything works:

```bash
npm test
```

You should see the test suite run successfully.

