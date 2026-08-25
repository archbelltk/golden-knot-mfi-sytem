# Builds and runs apps/api (NestJS) for Fly.io. apps/web deploys separately to
# Vercel and isn't part of this image.
#
# Copies the whole pnpm workspace rather than a hand-picked subset of
# packages — pnpm-workspace.yaml declares every app/package as a member, and
# `pnpm install --frozen-lockfile` expects all of them to be present on disk.
# Trades a bit of build-context size for not having to keep this file in sync
# every time a workspace member is added or removed.
FROM node:22-slim AS build
# node:*-slim has no OpenSSL — Prisma needs it to detect which query-engine
# binary to fetch. Without this it silently defaults to a guess
# ("openssl-1.1.x") that may not match what's actually on the image, which
# tends to surface as an engine-load failure at runtime, not at build time.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build:shared
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

FROM node:22-slim AS runtime
# The generated query engine binary needs OpenSSL at runtime too, not just
# at `prisma generate` time.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
