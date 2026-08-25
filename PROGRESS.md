# Progress

Last updated: 2026-08-25. Tracks implementation status against `spec.md`
(Phase 1 scope) and `ROADMAP.md`. Update this file as work lands — it's the
"what's actually done" companion to the roadmap's "what's planned."

## Repo state
- Not yet committed to git — full Phase 1 scaffold sits untracked on `main`.
- `pnpm build:shared`, `pnpm --filter api typecheck`, `pnpm --filter web typecheck` all clean.
- Local Supabase stack running; 3 Prisma migrations applied, schema up to date.
- Smoke-tested end-to-end: seeded admin login → JWT, `GET /api/gl-accounts` returns
  seeded chart of accounts, `GET /api/reports/trial-balance` balances to zero,
  web `/login` renders, `/` redirects via auth middleware.

## Phase 1 — Foundation

### Client onboarding & KYC (spec §3.1)
- [x] Client record, status lifecycle (Prospect → Under Review → Active → Dormant → Blacklisted)
- [x] KYC document upload (Supabase Storage), verify/reject review flow
- [x] Manual compliance screening record (PEP/sanctions) — **manual entry only**, no automated provider (Phase 3)
- [ ] Automated risk scoring/tiering, automated approval-threshold routing
- [ ] E-signature/acknowledgement capture for consent & disclosure (spec §3.1.4)
- [ ] Group/household linkage (Phase 4 — group lending)

### Loan management (spec §3.2)
- [x] Loan product config (rate, fees, tenor, currency, repayment frequency)
- [x] Loan application → multi-level approval trail (`LoanApproval`, threshold-based)
- [x] Disbursement with interest rate/type snapshot at disbursement time
- [x] Amortization schedule generation (flat & reducing balance)
- [x] Repayment with fees→interest→principal waterfall
- [x] Arrears tracking (`arrears.service.ts`)
- [ ] Affordability assessment / debt-to-income from credit bureau (needs CRB, Phase 3)
- [ ] Rescheduling/restructuring, top-up loans, early settlement rebate rules
- [ ] PAR/NPL classification and provisioning calculation (Phase 3)
- [ ] Write-off workflow

### Accounting (spec §3.3)
- [x] Chart of accounts (seeded)
- [x] Synchronous double-entry posting from loan events, inside the triggering transaction
- [x] Manual journal entries with maker-checker approval
- [x] Trial balance report
- [x] Accounting-period close (`accounting-periods` module)
- [ ] Income statement / balance sheet reports
- [ ] Bank statement import & reconciliation (Phase 2)
- [ ] Multicurrency revaluation at official exchange rate (Phase 2/3 — rate feed)

### Regulatory & audit (spec §1.3, §4)
- [x] `RegulatoryParameter` — append-only, effective-dated, audited
- [x] `AuditLog` on every client/loan/accounting mutation
- [x] `RegulatoryReturn` schema + manual placeholder record only — generation logic explicitly deferred to Phase 3 (see `regulatory-returns.service.ts`)
- [x] JWT auth + MFA, RBAC (`RolesGuard`), branch scoping
- [ ] Field-level encryption for national ID / account numbers (crypto module exists — confirm coverage)

### Web console (`apps/web`)
- [x] Auth (login, MFA verify), BFF proxy to API
- [x] Dashboard, clients, loan products, loan applications, loan accounts (incl. disburse/repay), ledger (chart of accounts, journal entries, reports), regulatory-params, audit-log, accounting-periods, security pages

## Not started (Phase 2+)
- Bank account verification, disbursement/collection rails (RTGS/ZIPIT/EcoCash/InnBucks)
- Settlement reconciliation
- CRB integration (credit pull, new-loan/repayment submission)
- RBZ regulatory return generation
- Automated AML/sanctions screening + FIU-STR workflow
- SMS/WhatsApp/USSD notification service
- Client/agent mobile app
- Group lending

## Known gaps to revisit before calling Phase 1 "done"
- No `spec.md` was in the repo until now (README referenced it) — now added at repo root.
- Consent/disclosure e-signature capture not yet implemented (spec §3.1.4 mandates it before onboarding completion).
- No income statement / balance sheet reports yet, only trial balance.
