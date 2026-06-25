FROM node:20-alpine AS base

# ── Stage 1: Install dependencies ──────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_PROXY_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_PROXY_URL=$NEXT_PUBLIC_PROXY_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN npm run build

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
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
