FROM node:20-alpine AS base

# ── Stage 1: Install dependencies ──────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install bun for faster installs + build (respects bun.lock)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ── Stage 2: Build ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps (bun installed)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars — set these in Coolify as build args
# NOTE: only public vars; secrets like DATABASE_URL/JWT_SECRET must not be baked at build time
ARG NEXT_PUBLIC_PROXY_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_PROXY_URL=$NEXT_PUBLIC_PROXY_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN bun run build

# ── Stage 3: Runner ────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="AniKitty" \
      org.opencontainers.image.description="Anime streaming — anikitty.moe" \
      org.opencontainers.image.source="https://github.com/fampep/anikitty"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Public dir includes PWA sw.js generated at build time
COPY --from=builder /app/public ./public

# Standalone output (smallest possible image)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
