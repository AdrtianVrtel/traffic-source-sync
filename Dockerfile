FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# libc6-compat: https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# python3/make/g++: kompilácia natívneho modulu better-sqlite3, ak nie je dostupný prebuilt binár
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Projekt používa pnpm (pnpm-lock.yaml)
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetry is disabled
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder hodnoty len pre build - Zod validácia env prebieha aj počas next build.
# Skutočné hodnoty sa dodajú za behu cez Coolify Environment Variables.
ENV NEXTAUTH_SECRET=build-placeholder \
    POSTHOG_PROJECT_ID=build-placeholder \
    POSTHOG_API_KEY=build-placeholder \
    DATABASE_PATH=/tmp/build.db

RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# SQLite databáza - v Coolify namountujte persistent volume na /app/data
RUN mkdir data
RUN chown nextjs:nodejs data
ENV DATABASE_PATH=/app/data/app.db

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
