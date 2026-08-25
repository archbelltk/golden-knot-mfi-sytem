# Golden Knot Financial Services — Microfinance System
## Software Requirements Specification (spec.md)

**Version:** 0.1 (Draft)
**Prepared for:** Golden Knot Financial Services (Zimbabwe)
**Prepared by:** Siyar Technologies
**Date:** 24 August 2026

---

## 1. Overview

### 1.1 Purpose
This document specifies the requirements for a microfinance management system for Golden Knot Financial Services ("Golden Knot"), a microfinance institution (MFI) operating in Zimbabwe. The system covers client onboarding, loan lifecycle management, and basic accounting, and is designed to operate as a **co-banking platform** — interoperating with commercial banks and the national payments infrastructure — while complying with Reserve Bank of Zimbabwe (RBZ) regulatory requirements for microfinance institutions.

### 1.2 Scope
In scope for this phase:
- Client (borrower) onboarding with KYC/AML checks
- Loan origination, disbursement, repayment, and collections
- General ledger / basic accounting sufficient for MFI financial reporting
- Co-banking integration (bank account verification, disbursement/collection rails, mobile money)
- RBZ regulatory compliance and reporting hooks (credit bureau, prudential returns, AML)

Out of scope for this phase (noted as future work):
- Savings/deposit-taking products (unless Golden Knot holds a deposit-taking microfinance licence)
- Insurance/bancassurance products
- Full treasury and investment management
- Card issuing

### 1.3 Regulatory Context (Zimbabwe)
Golden Knot operates under the **Microfinance Act [Chapter 24:29]** and is regulated by the **Reserve Bank of Zimbabwe (RBZ)** through its Microfinance and Exchange Control units. Key regulatory anchors the system must support:

- **Licensing class**: distinction between credit-only MFI and deposit-taking MFI (DTMFI), since permitted functions differ.
- **Interest rate and fee caps**: RBZ periodically issues maximum lending rate/APR and fee guidance for microfinance loans — the system must allow these caps to be configured and enforced, not hard-coded.
- **Credit Reference Bureau (CRB) reporting**: mandatory submission of borrower credit data to a registered Credit Reference Bureau (e.g. via the RBZ-supervised credit reference system) before and after disbursement.
- **AML/CFT obligations** under the Bank Use Promotion and Suppression of Money Laundering Act and RBZ AML/CFT guidelines: customer due diligence (CDD), enhanced due diligence (EDD) for high-risk clients, sanctions/PEP screening, and Suspicious Transaction Report (STR) triggers to the Financial Intelligence Unit (FIU).
- **Prudential and statistical returns**: periodic (monthly/quarterly) returns to RBZ on loan book size, portfolio at risk (PAR), non-performing loans (NPL), capital adequacy (for DTMFIs), and disbursements — the system must be able to generate these in the required format.
- **Consumer protection**: mandatory disclosure of effective interest rate, total cost of credit, and loan terms before client consent; a documented complaints-handling process.
- **Data protection**: alignment with the Cyber and Data Protection Act [Chapter 12:07] for handling client personal and financial data.
- **Currency**: support for multicurrency (ZiG and USD at minimum), reflecting Zimbabwe's multicurrency operating environment, with exchange rates sourced from RBZ's official rate where required for reporting.

> Note: exact rate caps, return formats, and thresholds change periodically by RBZ circular. The system should treat these as **configurable regulatory parameters**, not fixed constants, and maintain an audit trail of parameter changes.

---

## 2. System Architecture

### 2.1 High-Level Components
1. **Client Portal / Agent App** — onboarding, loan applications (web + mobile, agent-assisted and self-service)
2. **Core Microfinance Engine** — client, loan, and ledger domain logic
3. **Accounting Module** — general ledger, chart of accounts, financial statements
4. **Compliance & Reporting Module** — KYC/AML rules engine, RBZ/CRB report generation
5. **Co-Banking Integration Layer** — bank account verification, disbursement/collection, mobile money, RTGS/ZIPIT/NPS connectivity
6. **Admin/Back-Office Console** — underwriting, collections, reconciliation, reporting dashboards
7. **Notification Service** — SMS/USSD/WhatsApp/email for reminders, disclosures, statements

### 2.2 Suggested Technology Stack
Aligned with prior Siyar Technologies delivery patterns:
- **Frontend**: Next.js (App Router) for web portal/admin console; React Native/Expo for the agent/client mobile app
- **Backend**: Node.js (NestJS or Express) exposing REST/GraphQL APIs
- **Database**: PostgreSQL (via Supabase or self-hosted), with strict row-level access control for PII and financial data
- **Payments/mobile money**: EcoCash, InnBucks, Paynow (aggregator) for collections/disbursements; direct bank API/ISO 20022 or file-based integration for co-banking partners
- **Messaging**: SMS gateway (e.g. local aggregator) + WhatsApp Business API for reminders and disclosures
- **Infrastructure**: containerized deployment (Docker), with separate environments for production, UAT, and a sandbox for RBZ/CRB integration testing
- **Security**: encryption at rest and in transit, field-level encryption for national ID numbers and account numbers, role-based access control (RBAC), full audit logging

### 2.3 Co-Banking Integration Layer
Microfinance institutions in Zimbabwe typically do not hold direct access to RTGS/ZIPIT — they operate through a settlement relationship with a partner commercial bank. The integration layer should support:
- **Bank account verification** (name/account match) before disbursement
- **Disbursement rails**: bulk payment file or API push to partner bank for RTGS/ZIPIT/EcoCash/InnBucks payout
- **Collection rails**: direct debit order (where supported), mobile money collection, USSD pull, and bank-initiated collection
- **Settlement reconciliation**: automated matching of disbursement/collection batches against bank statements (via bank API or statement import)
- **Nostro/multicurrency account handling** for USD-denominated loans, if applicable
- **Configurable connector interface** so a new banking partner or payment aggregator can be added without core system changes

### 2.4 RBZ Integration Points
- **Credit Reference Bureau interface**: submit new-loan and repayment-performance data; pull credit reports pre-disbursement (this is typically via a licensed CRB's API, e.g. First Credit Bureau or Credit Reference Bureau Zimbabwe — both operate under RBZ oversight, not RBZ directly)
- **Regulatory returns export**: scheduled generation of RBZ-prescribed returns (loan book, PAR/NPL, disbursements, capital position for DTMFIs) in the required submission format (typically Excel/CSV template or RBZ's online returns portal)
- **AML/sanctions screening**: integration with a sanctions/PEP list provider, with FIU-STR workflow for flagged transactions
- **Exchange rate feed**: ingestion of official RBZ exchange rate for ZiG/USD conversion in reporting

---

## 3. Functional Requirements

### 3.1 Client Onboarding

**3.1.1 Prospect capture**
- Agent-assisted and self-service (web/mobile/USSD) application intake
- Capture of biodata, contact details, employment/income source, next of kin

**3.1.2 KYC / Identity Verification**
- National ID (and passport, for non-citizens) capture and verification
- Proof of address / residence confirmation
- Selfie/liveness capture for biometric-assisted verification (optional, phased)
- Document upload (payslip, bank statement, business registration for SME/group loans)

**3.1.3 Due Diligence**
- Automated PEP and sanctions list screening
- Risk scoring/tiering (standard vs. enhanced due diligence)
- Credit bureau pull and score retrieval
- Configurable approval workflow (auto-approve below risk threshold, manual review above)

**3.1.4 Consent & Disclosure**
- Mandatory display and e-signature/acknowledgement of loan terms, effective interest rate, and total cost of credit prior to onboarding completion
- Data protection consent (Cyber and Data Protection Act alignment)

**3.1.5 Client Record**
- Unique client ID, linked to national ID
- Client status lifecycle: Prospect → Under Review → Active → Dormant → Blacklisted
- Household/group linkage for group-lending models (e.g. village banking / solidarity groups), common in Zimbabwean microfinance

### 3.2 Loan Management

**3.2.1 Product Configuration**
- Configurable loan products: term loan, salary-based loan, group/solidarity loan, agriculture/SME loan
- Per-product configuration of interest rate (capped per RBZ guidance), fees, tenor, currency (ZiG/USD), collateral/guarantor requirements, repayment frequency

**3.2.2 Origination & Underwriting**
- Loan application linked to client record
- Affordability assessment (debt-to-income, existing obligations from credit bureau)
- Guarantor/collateral capture where applicable
- Multi-level approval workflow with configurable limits (loan officer → branch manager → credit committee, by amount threshold)
- Auto-generated loan agreement with mandatory disclosures (effective interest rate, total repayable, schedule)

**3.2.3 Disbursement**
- Disbursement to verified bank account, mobile wallet, or cash voucher
- Disbursement triggers ledger posting (loan principal out, receivable booked) and CRB new-account submission

**3.2.4 Repayment & Collections**
- Amortization schedule generation (flat or reducing balance, per product config)
- Repayment channels: mobile money, bank transfer, cash at branch, payroll deduction (for salary-based loans)
- Automated payment matching and allocation (fees → interest → principal, or per configured waterfall)
- Overdue/arrears tracking with configurable grace periods
- Automated reminders (SMS/WhatsApp) ahead of due dates and on arrears
- Collections workflow: soft reminders → field collection assignment → escalation → write-off/legal referral

**3.2.5 Loan Servicing**
- Rescheduling/restructuring workflow with approval and audit trail
- Top-up loans, subject to existing balance settlement rules
- Early settlement with configurable rebate/penalty rules

**3.2.6 Portfolio Monitoring**
- Portfolio at Risk (PAR 1/30/90) and NPL classification, aged per RBZ-prescribed buckets
- Provisioning calculation per RBZ prudential guidelines (or IFRS 9 expected credit loss, if applicable to Golden Knot's reporting framework)
- Write-off workflow with approval trail

### 3.3 Basic Accounting

**3.3.1 Chart of Accounts**
- MFI-appropriate chart of accounts: loan portfolio (asset), loan loss provisions (contra-asset), interest income, fee income, cash/bank accounts, client deposits (if DTMFI), operating expenses, equity

**3.3.2 General Ledger**
- Automated double-entry posting from loan events (disbursement, repayment, write-off, provisioning) — no manual re-entry of loan transactions
- Manual journal entry capability for non-loan transactions (payroll, rent, utilities), with maker-checker approval
- Multicurrency ledger (ZiG/USD) with configurable revaluation at official exchange rate

**3.3.3 Reconciliation**
- Bank statement import and auto-reconciliation against disbursement/collection batches
- Cash/till reconciliation for branch cash handling

**3.3.4 Financial Reporting**
- Trial balance, income statement, balance sheet
- Loan portfolio reports (by product, branch, officer, status)
- Standard MFI reports: PAR report, disbursement report, collections report, write-off report
- Export to RBZ regulatory return templates
- Audit trail on every posting (user, timestamp, before/after state) — immutable once period is closed

---

## 4. Non-Functional Requirements

- **Security**: RBAC with least-privilege access, MFA for back-office/admin users, encryption at rest and in transit, field-level encryption for national ID and account numbers
- **Auditability**: immutable audit log for all client, loan, and accounting events (who/what/when), required for RBZ examination and internal audit
- **Availability**: target 99.5%+ uptime for client-facing services; graceful degradation for third-party outages (bureau, bank, mobile money)
- **Data retention**: retain client and loan records per RBZ/Microfinance Act minimum retention periods (typically 5+ years post loan closure)
- **Localization**: English (and Shona/Ndebele for SMS/USSD prompts where relevant), ZWG/ZiG and USD currency support
- **Scalability**: designed to support multi-branch operation and growth in loan book/client volume without architecture rework
- **Interoperability**: connector-based design for adding new banking partners, mobile money providers, and the CRB, without core rewrites

---

## 5. Core Data Entities (indicative)

- **Client**: id, national_id, biodata, KYC status, risk tier, addresses, next of kin, group_id (nullable)
- **Loan Product**: id, name, currency, interest_type, rate, fee_schedule, tenor_range, repayment_frequency
- **Loan Account**: id, client_id, product_id, principal, disbursement_date, schedule, status, PAR bucket
- **Transaction**: id, loan_account_id, type (disbursement/repayment/fee/write-off), amount, channel, gl_reference
- **GL Entry**: id, account_code, debit, credit, currency, transaction_reference, period
- **Compliance Record**: client_id, screening_type (PEP/sanctions), result, reviewed_by, date
- **Regulatory Return**: period, type, generated_file, submission_status, submitted_by

---

## 6. Open Questions for Golden Knot

1. Is Golden Knot licensed as a **credit-only MFI** or a **deposit-taking MFI (DTMFI)**? This determines whether savings/deposit functionality is required and which capital-adequacy returns apply.
2. Which **partner bank(s)** will provide settlement/co-banking rails, and what integration method do they support (API, SFTP file exchange, or manual)?
3. Which **Credit Reference Bureau** is Golden Knot currently registered with (e.g. First Credit Bureau, Credit Reference Bureau Zimbabwe, Metropol), and what is their integration method?
4. Does Golden Knot currently do **group lending** (solidarity/village banking groups), or is this individual lending only?
5. What is the current **loan approval hierarchy** and delegated authority limits?
6. Are there existing systems (accounting package, core banking system) that this platform needs to integrate with or replace?
7. Preferred **branch/agent structure** — number of branches, field agent model, USSD requirement for rural clients?

---

## 7. Suggested Delivery Phases

**Phase 1 — Foundation**: Client onboarding, KYC/AML, loan product config, manual disbursement/collection, core ledger
**Phase 2 — Co-Banking & Automation**: Bank/mobile money integration, automated disbursement/collection, reconciliation
**Phase 3 — Regulatory Reporting**: CRB integration, RBZ return generation, provisioning automation
**Phase 4 — Scale & Self-Service**: Client mobile app, USSD channel, group lending, advanced collections/analytics

---

*This is a draft scoping document intended to guide detailed requirements workshops with Golden Knot Financial Services. Regulatory specifics (rate caps, return formats, CRB integration details) should be confirmed against the current RBZ Microfinance circulars in force at project kickoff, as these are updated periodically.*
