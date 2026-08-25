# Deployment

Topology: **Vercel** (apps/web, Next.js) + **Fly.io** (apps/api, NestJS) + **Supabase** (Postgres + Storage, cloud project).

The browser only ever talks to Vercel — Server Components and the `/api/backend/*`
proxy make the actual calls to the Fly.io API server-to-server, forwarding the
session as a Bearer token. So there's no browser-facing CORS/cookie problem to
solve across the two domains; `WEB_ORIGIN` on the API side is a defensive CORS
header, not something the login flow depends on.

`flyctl` and the `vercel` CLI are installed locally. Neither is authenticated —
that requires an interactive browser login only you can complete:

```bash
flyctl auth login
vercel login
```

## 1. Supabase (cloud project)

No cloud project exists yet for this app (the local one is Docker-only). Create one:

1. https://supabase.com/dashboard → **New project**. Pick a region close to your
   users/Fly region (see step 3).
2. **Project Settings → Database** → copy the **connection string** twice:
   - the **Transaction pooler** (port `6543`) → this is `DATABASE_URL`
   - the **Direct connection** (port `5432`) → this is `DIRECT_URL`

   Append `?pgbouncer=true` to the pooler URL if Supabase's copy button doesn't
   already include it — Prisma needs that flag to work correctly through pgbouncer.
3. **Project Settings → API** → copy the **Project URL** (`SUPABASE_URL`) and the
   **service_role** secret key (`SUPABASE_SERVICE_ROLE_KEY`, under "Project API keys").
4. Create the `kyc-documents` storage bucket once, the same way the local seed
   script does it: run `pnpm --filter api exec ts-node -e` isn't worth it — simplest
   is Storage → **New bucket** → name `kyc-documents`, **Private**.
5. Don't run migrations yet — that happens automatically on first Fly deploy
   (see `fly.toml`'s `release_command`).

## 2. Generate real secrets

Never reuse the `local-dev-only-...` values from `apps/api/.env` — those are
committed to the repo and public. Generate fresh ones:

```bash
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → FIELD_ENCRYPTION_KEY
```

`FIELD_ENCRYPTION_KEY` encrypts national ID fields at rest — once real client
data exists under a given key, rotating it requires a re-encryption migration
that doesn't exist yet. Treat it like a database credential from day one.

## 3. Deploy the API to Fly.io

From the repo root (`Dockerfile` and `fly.toml` already live there):

```bash
fly launch --no-deploy
```

This detects the existing `Dockerfile`/`fly.toml`, asks you to confirm or
change the app name (must be globally unique — edit `fly.toml`'s `app =` line
to match whatever you pick) and region. **Say no** to "Would you like to set
up a Postgres database?" and **no** to Redis — this app uses Supabase, not a
Fly-managed database.

Set the secrets (values from steps 1–2):

```bash
fly secrets set \
  DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true" \
  DIRECT_URL="postgresql://...:5432/postgres" \
  SUPABASE_URL="https://<project-ref>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  JWT_SECRET="..." \
  FIELD_ENCRYPTION_KEY="..." \
  WEB_ORIGIN="https://placeholder.vercel.app"
```

(`WEB_ORIGIN` is a placeholder for now — update it in step 5 once the real
Vercel URL exists.)

```bash
fly deploy
```

First deploy runs `prisma migrate deploy` automatically via `release_command`,
then boots the API. Verify:

```bash
curl https://<your-app>.fly.dev/api/gl-accounts
# → 401 (no token) is correct — it means the server is up and routing.
```

Seeding demo data against production is optional and up to you — the seed
script (`apps/api/prisma/seed.ts`) is safe to re-run (idempotent) if you want
demo accounts to poke around with:

```bash
fly ssh console -C "pnpm --filter api exec prisma db seed"
```

**Memory gotcha:** the seed command runs via `ts-node`, which loads the full
TypeScript compiler in-process alongside the already-running NestJS server.
On a `512mb` machine this leaves only a few MB free at idle, and `ts-node`
hangs indefinitely (no error, no output, no crash — it just never proceeds
past "Running seed command...") rather than failing loudly. `fly.toml`'s
`[[vm]]` block is set to `1024mb` for this reason — don't drop it back to
512 unless you also drop the seed step, since the API server alone runs fine
in less. If you do need to change VM size afterward, use `fly scale memory`
(and update `fly.toml` to match, or the next `fly deploy` will revert it).

## 4. Deploy the web app to Vercel

Recommended: **connect the GitHub repo** in the Vercel dashboard
(**Add New → Project → Import Git Repository**) rather than deploying via
CLI. This gives automatic production deploys on push to `main` and preview
deploys per branch/PR. Whichever way you deploy, the two project settings
below are what actually make the monorepo build work — set them once in
**Settings → General** and they apply regardless of how a deploy is
triggered:

- **Root Directory**: `apps/web`
- **Build Command** (override, in `apps/web/vercel.json`, already committed):
  `pnpm --filter @golden-knot/shared build && pnpm build`
  (the default `next build` alone would skip building the `@golden-knot/shared`
  workspace package apps/web imports from)

**Settings → Environment Variables**, add for Production (and Preview if you
want preview deploys to work too):

- `API_URL` = `https://<your-fly-app>.fly.dev/api`

**Two gotchas that cost real debugging time, in case they resurface:**

1. **Root Directory must be set correctly *before* the project's first link,
   or fixed via the API afterward** — `vercel link`/`vercel deploy` run from
   inside `apps/web` makes Vercel treat that folder as the entire uploaded
   source (Root Directory silently ends up `.`), so `packages/shared` never
   uploads and the build fails with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` and an
   empty "Packages found in the workspace" list. If that happens, patch it
   directly: `PATCH https://api.vercel.com/v9/projects/{projectId}` with
   `{"rootDirectory":"apps/web"}` (bearer token from the Vercel CLI's own
   `~/Library/Application Support/com.vercel.cli/auth.json` works), then
   deploy again from the **repo root**, not from `apps/web`.
2. **Never let a `pnpm-lock.yaml` or `pnpm-workspace.yaml` exist inside
   `apps/web`** (or any other workspace member) — only the repo root should
   have either file. A stray copy in `apps/web` makes pnpm treat it as its
   own workspace root with zero members the moment the build's cwd starts
   there (which is exactly what Vercel does with Root Directory set), and
   `@golden-knot/shared` becomes unresolvable — same
   `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` symptom as above, or an
   `ERR_PNPM_OUTDATED_LOCKFILE` complaint about deps that are clearly already
   in the root lockfile. Both files existed nested in `apps/web` from the
   initial scaffold commit and were removed for this reason — if a tool or a
   stray `pnpm install` run from inside `apps/web` regenerates one, delete it.

If deploying via CLI instead of the Git integration, run it from the **repo
root** (not `apps/web`) so the full monorepo uploads:

```bash
vercel --prod
```

## 5. Close the loop on CORS

Now that the real Vercel URL exists, update the API's CORS allowance:

```bash
fly secrets set WEB_ORIGIN="https://<your-actual-vercel-domain>"
```

This redeploys the API with the correct origin.

## 6. Verify end to end

1. Visit the Vercel URL → `/login` should render (logo, form).
2. Sign in with a seeded demo account (if you seeded in step 3) or a user you
   create directly against the production database.
3. Confirm the dashboard loads real data — this exercises the full path:
   browser → Vercel (Server Component) → Fly.io API → Supabase Postgres.
4. Check `fly logs` for the daily arrears cron firing (or trigger a manual
   check) — this only works because `fly.toml` keeps `min_machines_running = 1`
   (no scale-to-zero, which would otherwise skip the cron).

## Notes / things intentionally left out of scope

- **Custom domains** — not configured; both platforms default to their `*.vercel.app`
  / `*.fly.dev` subdomains. Add your own domain in each platform's dashboard
  when ready; no code changes needed (`WEB_ORIGIN`/`API_URL` just need updating).
- **Staging environment** — this guide covers one production environment.
  Vercel Preview deployments will work automatically per-branch/PR, but they'll
  all point at whatever `API_URL` you set for the Preview environment (same
  Fly API + same Supabase DB as production, unless you set up a second stack).
- **Email delivery** — unrelated to this deployment, but worth remembering:
  the forgot-password flow has no email transport configured (see
  `FORGOT_PASSWORD.md`). In production, `NODE_ENV=production` is set
  automatically by both Fly's Docker build and Next.js's own production build,
  which correctly suppresses the dev-only reset-link-in-response behavior —
  but that also means, right now, **nobody actually receives the reset link**
  in this deployment. Wire up real email before relying on this in production.
