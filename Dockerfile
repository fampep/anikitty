# syntax=docker/dockerfile:1

# Coolify: keep DATABASE_URL, JWT_*, ADMIN_PASSWORD, and API keys as RUNTIME env
# vars only (not build arguments). Passwords containing "#" break Docker ARG parsing.

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
# npm install (not ci) so a stale package-lock.json on the branch still builds in Coolify/Docker.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
# Retry/timeout hardening so a transient registry hiccup doesn't fail the whole deploy.
RUN npm install --no-fund --no-audit --no-update-notifier \
    --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
    --fetch-timeout=300000

COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PROXY_URL
ARG NEXT_PUBLIC_DONATION_RAISED_EUR
ARG DISCORD_CLIENT_ID
ARG COOLIFY_RESOURCE_UUID
# Proxy/cluster node origins — optional; each falls back to a built-in default.
ARG NEXT_PUBLIC_KITTY_NODE_PRIMARY
ARG NEXT_PUBLIC_KITTY_NODE_FALLBACK
ARG NEXT_PUBLIC_KITTY_NODE_THIRD
ARG NEXT_PUBLIC_KITTY_NODE_FOURTH
ARG NEXT_PUBLIC_KITTY_NODE_FIFTH
ARG NEXT_PUBLIC_KITTY_NODE_SIXTH
ARG NODE_MAX_OLD_SPACE_SIZE=2048

ENV CI=true
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_PROXY_URL=$NEXT_PUBLIC_PROXY_URL
ENV NEXT_PUBLIC_DONATION_RAISED_EUR=$NEXT_PUBLIC_DONATION_RAISED_EUR
ENV DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
ENV COOLIFY_RESOURCE_UUID=$COOLIFY_RESOURCE_UUID
ENV NEXT_PUBLIC_KITTY_NODE_PRIMARY=$NEXT_PUBLIC_KITTY_NODE_PRIMARY
ENV NEXT_PUBLIC_KITTY_NODE_FALLBACK=$NEXT_PUBLIC_KITTY_NODE_FALLBACK
ENV NEXT_PUBLIC_KITTY_NODE_THIRD=$NEXT_PUBLIC_KITTY_NODE_THIRD
ENV NEXT_PUBLIC_KITTY_NODE_FOURTH=$NEXT_PUBLIC_KITTY_NODE_FOURTH
ENV NEXT_PUBLIC_KITTY_NODE_FIFTH=$NEXT_PUBLIC_KITTY_NODE_FIFTH
ENV NEXT_PUBLIC_KITTY_NODE_SIXTH=$NEXT_PUBLIC_KITTY_NODE_SIXTH
ENV SKIP_NEXT_TYPECHECK=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}"
ENV STANDALONE_ONLY_BUILD=1

RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="AniKitty" \
      org.opencontainers.image.source="https://github.com/fampep/anikitty"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV INTERNAL_API_URL=http://127.0.0.1:3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# prepare-standalone.mjs bundles public/ + discord bot scripts into standalone.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start-with-bot.mjs ./scripts/start-with-bot.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/discord-bot.mjs ./scripts/discord-bot.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/internal-api-url.mjs ./scripts/internal-api-url.mjs

# Ensure discord.js is present even if postbuild install was skipped/failed.
USER root
RUN npm install discord.js@^14.26.5 --omit=dev --no-fund --no-audit \
 && chown -R nextjs:nodejs /app
USER nextjs

USER nextjs
EXPOSE 3000
CMD ["node", "scripts/start-with-bot.mjs"]
