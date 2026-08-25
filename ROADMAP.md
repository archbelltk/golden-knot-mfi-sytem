# Roadmap

Delivery phases per `spec.md` §7, refined against the actual build plan
(`/Users/macbook/.claude/plans/jiggly-strolling-hickey.md`). See `PROGRESS.md` for
current implementation status within a phase.

## Phase 1 — Foundation (current)
Client onboarding/KYC skeleton, loan product config, manual disbursement/collection,
core double-entry ledger. No live bank/mobile-money/CRB/RBZ integrations — the data
model anticipates them, but everything is manual/back-office in this phase.

- Client onboarding, KYC document capture, manual compliance screening records
- Configurable loan products, regulatory parameters (append-only, audited)
- Loan application → multi-level approval → disbursement → repayment (fees→interest→principal)
- GL: chart of accounts, synchronous double-entry posting, journal entries (maker-checker), trial balance
- Auth (JWT + MFA), RBAC, branch scoping, audit log on every mutation
- Accounting-period close, arrears tracking

## Phase 2 — Co-Banking & Automation
Bank/mobile money integration, automated disbursement/collection, reconciliation.

- Bank account verification (name/account match) before disbursement
- Disbursement rails: partner bank API/file push for RTGS/ZIPIT, EcoCash, InnBucks
- Collection rails: mobile money collection, USSD pull, direct debit, payroll deduction
- Settlement reconciliation: bank statement import, auto-match against disbursement/collection batches
- Configurable connector interface so a new banking/mobile-money partner doesn't require core changes
- Automated SMS/WhatsApp reminders ahead of due dates and on arrears

## Phase 3 — Regulatory Reporting
CRB integration, RBZ return generation, provisioning automation.

- Credit Reference Bureau interface: pre-disbursement pull, new-loan/repayment submission
- RBZ prudential/statistical returns: loan book, PAR/NPL, disbursements, capital position — generated to the required submission format
- AML/sanctions screening automation (replaces the manual `ComplianceRecord` entry in Phase 1) with FIU-STR workflow for flagged transactions
- PAR aging and NPL classification per RBZ-prescribed buckets; provisioning calculation (RBZ prudential guidance or IFRS 9 ECL)
- Official RBZ exchange rate feed ingestion for ZiG/USD revaluation/reporting

## Phase 4 — Scale & Self-Service
Client mobile app, USSD channel, group lending, advanced collections/analytics.

- React Native/Expo client & agent app; self-service loan applications
- USSD channel for rural clients (Shona/Ndebele prompts)
- Group lending / solidarity / village-banking model (client group linkage, group repayment)
- Collections workflow automation: field assignment, escalation, write-off/legal referral
- Advanced portfolio analytics dashboards

## Open questions blocking Phase 2+ (from `spec.md` §6)
These are business/vendor decisions Golden Knot needs to make — not implementation
detail — and should be resolved before Phase 2 scoping starts in earnest:

1. Credit-only MFI or deposit-taking MFI (DTMFI) licence class?
2. Partner bank(s) for settlement/co-banking, and their integration method?
3. Which Credit Reference Bureau, and their integration method?
4. Group lending in scope, or individual lending only?
5. Current loan approval hierarchy and delegated authority limits?
6. Existing systems (accounting package, core banking) to integrate with or replace?
7. Branch/agent structure — branch count, field agent model, USSD requirement?
