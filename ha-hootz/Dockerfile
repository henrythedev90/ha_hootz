# Use Node.js 20 LTS (Fly.io supports this well)
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
# npm ci installs both dependencies and devDependencies by default
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files needed for build
COPY . .
# Ensure TypeScript and build tools are available
RUN apk add --no-cache libc6-compat

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# Copy production dependencies (needed for custom server and runtime)
COPY --from=deps /app/node_modules ./node_modules

# Copy source files needed for custom server
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/store ./store
COPY --from=builder /app/hooks ./hooks
COPY --from=builder /app/types ./types
COPY --from=builder /app/components ./components
COPY --from=builder /app/app ./app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the custom server using tsx (TypeScript execution)
CMD ["npx", "tsx", "server.ts"]
