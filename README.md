# Golden Knot MFI — Phase 1 Foundation

Microfinance management system for Golden Knot Financial Services (Zimbabwe). This is the
Phase 1 build: client onboarding/KYC, loan product configuration, manual disbursement/collection,
and a core double-entry ledger — see [`spec.md`](spec.md) for the full requirements,
[`ROADMAP.md`](ROADMAP.md) for the delivery phases, [`PROGRESS.md`](PROGRESS.md) for current
implementation status, and `/Users/macbook/.claude/plans/` for the build plan this scaffold followed.

## Stack

- **apps/web** — Next.js 16 (App Router) admin/back-office console
- **apps/api** — NestJS REST API, the only thing that talks to Postgres (via Prisma)
- **packages/shared** — `@golden-knot/shared`: enums, zod validation schemas, shared types, built to CommonJS
- **packages/config** — shared TypeScript/ESLint presets
- **supabase/** — local Supabase stack config (Postgres + Storage), Docker-based via the Supabase CLI

## Prerequisites

- Node.js 20+, pnpm 10+
- Docker Desktop running
- Supabase CLI (`brew install supabase/tap/supabase` or see supabase.com/docs/guides/cli)

## First-time setup

```bash
pnpm install
supabase start                 # spins up local Postgres + Storage in Docker
pnpm --filter api exec prisma migrate dev   # create tables
pnpm --filter api exec prisma db seed       # chart of accounts, demo branch/users/products/client
```

`supabase start` prints local connection details. `apps/api/.env` and `apps/web/.env.local` are
already configured to match the default local Supabase ports (54321/54322); update
`SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env` if your local stack prints a different key.

Demo users (password `ChangeMe123!` for all): `admin@demo.goldenknot.local`,
`backoffice@demo.goldenknot.local`, `loanofficer@demo.goldenknot.local`,
`branchmanager@demo.goldenknot.local`, `creditcommittee@demo.goldenknot.local`.

## Running

```bash
pnpm build:shared   # build @golden-knot/shared once (or run before each dev/build)
pnpm dev            # runs apps/api (port 3000) and apps/web (port 3001) together
```

Or individually: `pnpm dev:api`, `pnpm dev:web`.

Visit http://localhost:3001, sign in with a demo account.

## Other scripts

- `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` — Prisma workflows (delegates to `apps/api`)
- `pnpm --filter api typecheck` / `pnpm --filter web typecheck` — type-check each app
- `pnpm build` — production build of `@golden-knot/shared` + both apps

## Architecture notes

- **apps/web never touches Postgres.** All data flows through the NestJS API. Server Components
  call it directly (`lib/server-fetch.ts`, forwarding the session cookie as a Bearer token);
  Client Components go through `/api/backend/*` (`lib/api-proxy.ts`), a same-origin proxy that
  keeps the JWT in an httpOnly cookie and out of client JS.
- **Ledger postings are synchronous**, inside the same DB transaction as the triggering loan event
  (disbursement, repayment) — see `apps/api/src/ledger/ledger-posting.service.ts`. A loan can never
  be marked disbursed without its GL entries existing atomically.
- **Regulatory parameters are append-only** (`RegulatoryParameter` table) — a "change" is a new
  row, never an UPDATE, so RBZ rate-cap history stays fully auditable.
- **Every client/loan/accounting mutation writes an `AuditLog` row** in the same transaction as the
  mutation itself (`apps/api/src/audit/audit.service.ts`).
