# syntax=docker/dockerfile:1

# Coolify: keep DATABASE_URL, JWT_*, ADMIN_PASSWORD, and API keys as RUNTIME env
# vars only (not build arguments). Passwords containing "#" break Docker ARG parsing.

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
# npm install (not ci) so a stale package-lock.json on the branch still builds in Coolify/Docker.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
# Retry/timeout hardening so a transient registry hiccup doesn't fail the whole deploy.
RUN npm install --no-fund --no-audit --no-update-notifier \
    --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
    --fetch-timeout=300000

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PROXY_URL
ARG NEXT_PUBLIC_DONATION_RAISED_EUR
ARG DISCORD_CLIENT_ID
ARG COOLIFY_RESOURCE_UUID
# Proxy/cluster node origins — optional; each falls back to a built-in default.
ARG NEXT_PUBLIC_KITTY_NODE_PRIMARY
ARG NEXT_PUBLIC_KITTY_NODE_THIRD
ARG NEXT_PUBLIC_KITTY_NODE_FOURTH
ARG NEXT_PUBLIC_KITTY_NODE_FIFTH
ARG NODE_MAX_OLD_SPACE_SIZE=2048

ENV CI=true
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_PROXY_URL=$NEXT_PUBLIC_PROXY_URL
ENV NEXT_PUBLIC_DONATION_RAISED_EUR=$NEXT_PUBLIC_DONATION_RAISED_EUR
ENV DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
ENV COOLIFY_RESOURCE_UUID=$COOLIFY_RESOURCE_UUID
ENV NEXT_PUBLIC_KITTY_NODE_PRIMARY=$NEXT_PUBLIC_KITTY_NODE_PRIMARY
ENV NEXT_PUBLIC_KITTY_NODE_THIRD=$NEXT_PUBLIC_KITTY_NODE_THIRD
ENV NEXT_PUBLIC_KITTY_NODE_FOURTH=$NEXT_PUBLIC_KITTY_NODE_FOURTH
ENV NEXT_PUBLIC_KITTY_NODE_FIFTH=$NEXT_PUBLIC_KITTY_NODE_FIFTH
ENV SKIP_NEXT_TYPECHECK=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}"

RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="AniKitty" \
      org.opencontainers.image.source="https://github.com/fampep/anikitty"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# prepare-standalone.mjs bundles public/ into standalone during Docker builds (CI=true).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
