# ─────────────────────────────────────────────────────────────────────────────
# CampusFlow Backend — Multi-stage Dockerfile
#
# Node 24 is the current Active LTS. Node 26 is expected to enter LTS around
# the end of October 2026; upgrading is a one-line change to NODE_VERSION.
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=24

# ── Stage 1: All dependencies (for building) ─────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS deps

WORKDIR /app

# openssl lets Prisma detect the OpenSSL version (debian-openssl-3.0.x)
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# --ignore-scripts is safe here: bcrypt ships N-API prebuilds (node-gyp-build
# picks them up at runtime) and Prisma engines are fetched by `prisma generate`.
RUN npm ci --ignore-scripts

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM deps AS builder

WORKDIR /app

COPY . .

RUN npx prisma generate && npm run build

# ── Stage 3: Production dependencies only ────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS prod-deps

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# `prisma` (CLI, pinned to 5.22.0) is a production dependency so that
# `prisma migrate deploy` at container start never downloads another version.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Generate the Prisma client and download the engines (query engine for
# debian-openssl-3.0.x + schema engine for migrations) into node_modules.
COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate

# ── Stage 4: Production runner ───────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Prisma needs libssl at runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dependencies and build output stay root-owned (read-only for the app user)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY package.json ./

# Winston writes to ./logs — the only path the app user needs to write to
RUN mkdir -p /app/logs && chown node:node /app/logs

# Run as the unprivileged `node` user that ships with the official image
USER node

# Render injects PORT (default 10000); locally the app defaults to 3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Apply migrations with the pinned local Prisma CLI, then hand PID 1 to node
# (exec) so SIGTERM reaches the app for graceful shutdown.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main"]
