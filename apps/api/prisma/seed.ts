import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createHmac, randomBytes, scryptSync } from 'crypto';
import { AmortizationService } from '../src/loan-accounts/amortization.service';

const prisma = new PrismaClient();
const amortization = new AmortizationService();

// Standalone mirror of CryptoService — this script runs outside Nest's DI
// container, so it can't inject the real service.
function encryptNationalId(plaintext: string): { nationalId: string; nationalIdHash: string } {
  const secret = process.env.FIELD_ENCRYPTION_KEY;
  if (!secret) throw new Error('FIELD_ENCRYPTION_KEY is not set');
  const key = scryptSync(secret, 'golden-knot-field-encryption', 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const nationalId = Buffer.concat([iv, authTag, encrypted]).toString('base64');
  const nationalIdHash = createHmac('sha256', secret).update(plaintext.trim().toUpperCase()).digest('hex');
  return { nationalId, nationalIdHash };
}

const CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Cash / Bank', type: 'ASSET' as const },
  { code: '1100', name: 'Loan Portfolio (Asset)', type: 'ASSET' as const },
  { code: '1150', name: 'Loan Loss Provision', type: 'CONTRA_ASSET' as const },
  { code: '2000', name: 'Client Deposits (placeholder — DTMFI only)', type: 'LIABILITY' as const },
  { code: '3000', name: 'Equity', type: 'EQUITY' as const },
  { code: '4000', name: 'Interest Income', type: 'INCOME' as const },
  { code: '4100', name: 'Fee Income', type: 'INCOME' as const },
  { code: '5000', name: 'Operating Expenses', type: 'EXPENSE' as const },
];

const GL = {
  CASH: '1000',
  PORTFOLIO: '1100',
  PROVISION: '1150',
  EQUITY: '3000',
  EXPENSE: '5000',
  INTEREST_INCOME: '4000',
  FEE_INCOME: '4100',
};

const DEMO_USERS = [
  { email: 'admin@demo.goldenknot.local', fullName: 'Admin User', role: 'ADMIN' as const },
  { email: 'backoffice@demo.goldenknot.local', fullName: 'Back Office User', role: 'BACK_OFFICE' as const },
  { email: 'loanofficer@demo.goldenknot.local', fullName: 'Loan Officer', role: 'LOAN_OFFICER' as const },
  { email: 'branchmanager@demo.goldenknot.local', fullName: 'Branch Manager', role: 'BRANCH_MANAGER' as const },
  { email: 'creditcommittee@demo.goldenknot.local', fullName: 'Credit Committee', role: 'CREDIT_COMMITTEE' as const },
];

const DEMO_PASSWORD = 'ChangeMe123!';

async function ensureKycBucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping storage bucket setup');
    return;
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === 'kyc-documents')) {
    const { error } = await supabase.storage.createBucket('kyc-documents', { public: false });
    if (error) console.warn('Could not create kyc-documents bucket:', error.message);
    else console.log('Created kyc-documents storage bucket');
  }
}

// ---------------------------------------------------------------------------
// Demo scenario helpers — standalone reimplementations of the real service
// logic (LedgerPostingService / RepaymentsService / LoanApplicationsService)
// since this script runs outside Nest's DI container. Keep in sync with
// those services if the GL posting rules change.
// ---------------------------------------------------------------------------

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function glAccountId(code: string): Promise<string> {
  const account = await prisma.gLAccount.findUniqueOrThrow({ where: { code } });
  return account.id;
}

interface SeedGLLine {
  glAccountId: string;
  debit?: number;
  credit?: number;
  currency: string;
  narrative: string;
}

async function postGLEntry(params: {
  reference: string;
  description: string;
  period: string;
  transactionId?: string;
  actor: { id: string; role: string };
  postedAt: Date;
  lines: SeedGLLine[];
}) {
  const entry = await prisma.gLEntry.create({
    data: {
      transactionId: params.transactionId,
      reference: params.reference,
      description: params.description,
      period: params.period,
      status: 'POSTED',
      makerId: params.actor.id,
      postedAt: params.postedAt,
      createdAt: params.postedAt,
      lines: {
        create: params.lines.map((l) => ({
          glAccountId: l.glAccountId,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          currency: l.currency as never,
          narrative: l.narrative,
        })),
      },
    },
    include: { lines: true },
  });
  await auditLog({ entityType: 'GLEntry', entityId: entry.id, action: 'CREATE', actor: params.actor, after: entry, createdAt: params.postedAt });
}

async function auditLog(params: {
  entityType: string;
  entityId: string;
  action: string;
  actor: { id: string; role: string };
  before?: unknown;
  after?: unknown;
  createdAt?: Date;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action as never,
      actorId: params.actor.id,
      actorRole: params.actor.role,
      before: params.before as never,
      after: params.after as never,
      createdAt: params.createdAt ?? new Date(),
    },
  });
}

const LEVEL_ORDER = ['LOAN_OFFICER', 'BRANCH_MANAGER', 'CREDIT_COMMITTEE'];
const STATUS_FOR_LEVEL: Record<string, string> = {
  LOAN_OFFICER: 'PENDING_LOAN_OFFICER',
  BRANCH_MANAGER: 'PENDING_BRANCH_MANAGER',
  CREDIT_COMMITTEE: 'PENDING_CREDIT_COMMITTEE',
};

async function seedClient(input: {
  clientNumber: string;
  nationalIdPlain: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  status: string;
  addressLine: string;
  city: string;
  province: string;
  kinName: string;
  kinRelationship: string;
  kinPhone: string;
  branchId: string;
  actor?: { id: string; role: string };
}) {
  const { nationalId, nationalIdHash } = encryptNationalId(input.nationalIdPlain);
  const client = await prisma.client.upsert({
    where: { nationalIdHash },
    update: {},
    create: {
      clientNumber: input.clientNumber,
      nationalId,
      nationalIdHash,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: new Date(input.dateOfBirth),
      phone: input.phone,
      email: input.email,
      branchId: input.branchId,
      status: input.status as never,
      addresses: {
        create: [{ type: 'RESIDENTIAL', line1: input.addressLine, city: input.city, province: input.province }],
      },
      nextOfKin: {
        create: [{ fullName: input.kinName, relationship: input.kinRelationship, phone: input.kinPhone }],
      },
    },
  });
  if (input.actor) {
    await auditLog({ entityType: 'Client', entityId: client.id, action: 'CREATE', actor: input.actor, after: client, createdAt: client.createdAt });
  }
  return client;
}

async function createApplication(input: {
  clientId: string;
  productId: string;
  principal: number;
  tenorMonths: number;
  requiredLevel: string;
  actor: { id: string; role: string };
}) {
  const application = await prisma.loanApplication.create({
    data: {
      clientId: input.clientId,
      productId: input.productId,
      requestedPrincipal: input.principal,
      requestedTenorMonths: input.tenorMonths,
      status: 'PENDING_LOAN_OFFICER',
      requiredLevel: input.requiredLevel as never,
      currentLevel: 'LOAN_OFFICER',
      disclosureAcknowledgedAt: new Date(),
      disclosureAcknowledgedBy: input.actor.id,
    },
  });
  await auditLog({ entityType: 'LoanApplication', entityId: application.id, action: 'CREATE', actor: input.actor, after: application, createdAt: application.createdAt });
  return application;
}

/** Mirrors LoanApplicationsService#decide. Returns the updated application. */
async function decide(application: { id: string; requiredLevel: string; status: string }, level: string, decision: 'APPROVED' | 'REJECTED', approver: { id: string; role: string }) {
  await prisma.loanApproval.create({
    data: { loanApplicationId: application.id, level: level as never, approverId: approver.id, decision: decision as never },
  });

  let nextStatus: string;
  let nextLevel: string | null = null;
  if (decision === 'REJECTED') {
    nextStatus = 'REJECTED';
  } else {
    const isFinalLevel = LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(application.requiredLevel);
    if (isFinalLevel) {
      nextStatus = 'APPROVED';
    } else {
      nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1];
      nextStatus = STATUS_FOR_LEVEL[nextLevel];
    }
  }

  const updated = await prisma.loanApplication.update({
    where: { id: application.id },
    data: { status: nextStatus as never, currentLevel: nextLevel as never },
  });
  await auditLog({
    entityType: 'LoanApplication',
    entityId: application.id,
    action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
    actor: approver,
    before: { status: application.status },
    after: { status: updated.status, decision },
  });
  return updated;
}

async function createLoanAccount(
  application: { id: string; clientId: string; productId: string; requestedPrincipal: unknown; requestedTenorMonths: number },
  product: { currency: string; interestRate: unknown; interestType: string; repaymentFrequency: string; gracePeriodDays: number },
  actor: { id: string; role: string },
) {
  const account = await prisma.loanAccount.create({
    data: {
      loanApplicationId: application.id,
      clientId: application.clientId,
      productId: application.productId,
      principal: application.requestedPrincipal as never,
      currency: product.currency as never,
      interestRate: product.interestRate as never,
      interestType: product.interestType as never,
      tenorMonths: application.requestedTenorMonths,
      repaymentFrequency: product.repaymentFrequency as never,
      gracePeriodDays: product.gracePeriodDays,
      status: 'PENDING_DISBURSEMENT',
    },
  });
  await auditLog({ entityType: 'LoanAccount', entityId: account.id, action: 'CREATE', actor, after: account, createdAt: account.createdAt });
  return account;
}

async function disburseLoanAccount(
  loanAccount: { id: string; currency: string },
  client: { firstName: string; lastName: string },
  product: { interestRate: unknown; interestType: string; repaymentFrequency: string; feeSchedule: unknown },
  principal: number,
  tenorMonths: number,
  disbursedDaysAgo: number,
  actor: { id: string; role: string },
) {
  const disbursementDate = daysAgo(disbursedDaysAgo);
  const scheduleDrafts = amortization.generateSchedule({
    principal,
    monthlyRate: Number(product.interestRate),
    tenorMonths,
    interestType: product.interestType as never,
    repaymentFrequency: product.repaymentFrequency as never,
    disbursementDate,
    feeSchedule: product.feeSchedule as { type: 'FLAT' | 'PERCENT_OF_PRINCIPAL'; amount: number }[],
  });
  const maturityDate = scheduleDrafts[scheduleDrafts.length - 1]?.dueDate ?? disbursementDate;

  await prisma.repaymentScheduleLine.createMany({
    data: scheduleDrafts.map((l) => ({
      loanAccountId: loanAccount.id,
      installmentNumber: l.installmentNumber,
      dueDate: l.dueDate,
      principalDue: l.principalDue,
      interestDue: l.interestDue,
      feesDue: l.feesDue,
      status: 'PENDING',
    })),
  });

  await prisma.loanAccount.update({
    where: { id: loanAccount.id },
    data: { status: 'ACTIVE', disbursementDate, maturityDate },
  });
  await auditLog({
    entityType: 'LoanAccount',
    entityId: loanAccount.id,
    action: 'STATUS_CHANGE',
    actor,
    before: { status: 'PENDING_DISBURSEMENT' },
    after: { status: 'ACTIVE', disbursementDate },
    createdAt: disbursementDate,
  });

  const transaction = await prisma.transaction.create({
    data: {
      loanAccountId: loanAccount.id,
      type: 'DISBURSEMENT',
      amount: principal,
      currency: loanAccount.currency as never,
      channel: 'BANK',
      recordedBy: actor.id,
      recordedAt: disbursementDate,
    },
  });

  await postGLEntry({
    reference: `DISB-${transaction.id}`,
    description: `Disbursement of loan to ${client.firstName} ${client.lastName}`,
    period: periodOf(disbursementDate),
    transactionId: transaction.id,
    actor,
    postedAt: disbursementDate,
    lines: [
      { glAccountId: await glAccountId(GL.PORTFOLIO), debit: principal, currency: loanAccount.currency, narrative: 'Loan principal disbursed' },
      { glAccountId: await glAccountId(GL.CASH), credit: principal, currency: loanAccount.currency, narrative: 'Cash/bank paid out' },
    ],
  });
}

/** Mirrors RepaymentsService#record's fees→interest→principal waterfall. */
async function recordRepayment(
  loanAccount: { id: string; currency: string },
  client: { firstName: string; lastName: string },
  amount: number,
  paidAtDaysAgo: number,
  actor: { id: string; role: string },
) {
  const paidAt = daysAgo(paidAtDaysAgo);
  const lines = await prisma.repaymentScheduleLine.findMany({
    where: { loanAccountId: loanAccount.id, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
    orderBy: { installmentNumber: 'asc' },
  });

  let remaining = amount;
  let feesAllocated = 0;
  let interestAllocated = 0;
  let principalAllocated = 0;

  for (const line of lines) {
    if (remaining <= 0) break;

    const feesOwed = Number(line.feesDue) - Number(line.feesPaid);
    const feesToPay = Math.min(remaining, feesOwed);
    remaining -= feesToPay;
    feesAllocated += feesToPay;

    const interestOwed = Number(line.interestDue) - Number(line.interestPaid);
    const interestToPay = Math.min(remaining, interestOwed);
    remaining -= interestToPay;
    interestAllocated += interestToPay;

    const principalOwed = Number(line.principalDue) - Number(line.principalPaid);
    const principalToPay = Math.min(remaining, principalOwed);
    remaining -= principalToPay;
    principalAllocated += principalToPay;

    const newFeesPaid = Number(line.feesPaid) + feesToPay;
    const newInterestPaid = Number(line.interestPaid) + interestToPay;
    const newPrincipalPaid = Number(line.principalPaid) + principalToPay;
    const fullyPaid =
      newFeesPaid >= Number(line.feesDue) &&
      newInterestPaid >= Number(line.interestDue) &&
      newPrincipalPaid >= Number(line.principalDue);

    await prisma.repaymentScheduleLine.update({
      where: { id: line.id },
      data: {
        feesPaid: newFeesPaid,
        interestPaid: newInterestPaid,
        principalPaid: newPrincipalPaid,
        status: fullyPaid ? 'PAID' : newFeesPaid + newInterestPaid + newPrincipalPaid > 0 ? 'PARTIAL' : 'PENDING',
      },
    });
  }

  const transaction = await prisma.transaction.create({
    data: {
      loanAccountId: loanAccount.id,
      type: 'REPAYMENT',
      amount,
      currency: loanAccount.currency as never,
      channel: 'CASH',
      recordedBy: actor.id,
      recordedAt: paidAt,
    },
  });

  const glLines: SeedGLLine[] = [
    { glAccountId: await glAccountId(GL.CASH), debit: amount, currency: loanAccount.currency, narrative: 'Repayment received' },
  ];
  if (feesAllocated > 0) {
    glLines.push({ glAccountId: await glAccountId(GL.FEE_INCOME), credit: round2(feesAllocated), currency: loanAccount.currency, narrative: 'Fee income' });
  }
  if (interestAllocated > 0) {
    glLines.push({ glAccountId: await glAccountId(GL.INTEREST_INCOME), credit: round2(interestAllocated), currency: loanAccount.currency, narrative: 'Interest income' });
  }
  if (principalAllocated > 0) {
    glLines.push({ glAccountId: await glAccountId(GL.PORTFOLIO), credit: round2(principalAllocated), currency: loanAccount.currency, narrative: 'Principal repaid' });
  }

  await postGLEntry({
    reference: `RPY-${transaction.id}`,
    description: `Repayment from ${client.firstName} ${client.lastName}`,
    period: periodOf(paidAt),
    transactionId: transaction.id,
    actor,
    postedAt: paidAt,
    lines: glLines,
  });
}

async function markArrears(loanAccountId: string, daysInArrears: number, parBucket: string, actor: { id: string; role: string }) {
  await prisma.loanAccount.update({
    where: { id: loanAccountId },
    data: { status: 'ARREARS', daysInArrears, parBucket: parBucket as never },
  });
  await prisma.repaymentScheduleLine.updateMany({
    where: { loanAccountId, status: 'PENDING', dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });
  await auditLog({
    entityType: 'LoanAccount',
    entityId: loanAccountId,
    action: 'STATUS_CHANGE',
    actor,
    before: { status: 'ACTIVE' },
    after: { status: 'ARREARS', daysInArrears, parBucket },
  });
}

/** Mirrors LoanAccountsService#writeOff. */
async function writeOffLoan(loanAccount: { id: string; currency: string }, client: { firstName: string; lastName: string }, actor: { id: string; role: string }) {
  const lines = await prisma.repaymentScheduleLine.findMany({ where: { loanAccountId: loanAccount.id } });
  const outstanding = round2(lines.reduce((sum, l) => sum + Number(l.principalDue) - Number(l.principalPaid), 0));

  await prisma.loanAccount.update({ where: { id: loanAccount.id }, data: { status: 'WRITTEN_OFF' } });
  await auditLog({
    entityType: 'LoanAccount',
    entityId: loanAccount.id,
    action: 'STATUS_CHANGE',
    actor,
    before: { status: 'ACTIVE' },
    after: { status: 'WRITTEN_OFF' },
  });

  const transaction = await prisma.transaction.create({
    data: {
      loanAccountId: loanAccount.id,
      type: 'WRITE_OFF',
      amount: outstanding,
      currency: loanAccount.currency as never,
      channel: 'INTERNAL',
      recordedBy: actor.id,
    },
  });

  await postGLEntry({
    reference: `WO-${transaction.id}`,
    description: `Write-off of loan for ${client.firstName} ${client.lastName}`,
    period: periodOf(new Date()),
    transactionId: transaction.id,
    actor,
    postedAt: new Date(),
    lines: [
      { glAccountId: await glAccountId(GL.PROVISION), debit: outstanding, currency: loanAccount.currency, narrative: 'Loan loss provision utilised' },
      { glAccountId: await glAccountId(GL.PORTFOLIO), credit: outstanding, currency: loanAccount.currency, narrative: 'Loan principal written off' },
    ],
  });
}

async function main() {
  console.log('Seeding chart of accounts...');
  for (const account of CHART_OF_ACCOUNTS) {
    await prisma.gLAccount.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }

  console.log('Seeding demo branch...');
  const branch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {},
    create: { name: 'Harare Head Office', code: 'HQ' },
  });

  console.log('Seeding demo users...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash, branchId: branch.id },
    });
  }
  const [admin, backOffice, loanOfficer, branchManager, creditCommittee] = await Promise.all(
    DEMO_USERS.map((u) => prisma.user.findUniqueOrThrow({ where: { email: u.email } })),
  );

  console.log('Seeding demo loan products...');
  const salaryProduct = await prisma.loanProduct.upsert({
    where: { code: 'SALARY-ZIG' },
    update: {},
    create: {
      name: 'Salary-Based Loan (ZiG)',
      code: 'SALARY-ZIG',
      currency: 'ZIG',
      interestType: 'REDUCING_BALANCE',
      interestRate: 0.05,
      feeSchedule: [{ label: 'Origination fee', type: 'PERCENT_OF_PRINCIPAL', amount: 2 }],
      minTenorMonths: 3,
      maxTenorMonths: 12,
      repaymentFrequency: 'MONTHLY',
      gracePeriodDays: 3,
    },
  });
  const smeProduct = await prisma.loanProduct.upsert({
    where: { code: 'SME-USD' },
    update: {},
    create: {
      name: 'SME / Group Loan (USD)',
      code: 'SME-USD',
      currency: 'USD',
      interestType: 'FLAT',
      interestRate: 0.035,
      feeSchedule: [{ label: 'Processing fee', type: 'FLAT', amount: 15 }],
      minTenorMonths: 6,
      maxTenorMonths: 24,
      repaymentFrequency: 'MONTHLY',
      gracePeriodDays: 5,
    },
  });

  console.log('Seeding approval thresholds...');
  const existingThresholds = await prisma.approvalThreshold.count();
  if (existingThresholds === 0) {
    await prisma.approvalThreshold.createMany({
      data: [
        { minAmount: 0, maxAmount: 3000, requiredLevel: 'LOAN_OFFICER' },
        { minAmount: 3000, maxAmount: 15000, requiredLevel: 'BRANCH_MANAGER' },
        { minAmount: 15000, maxAmount: null, requiredLevel: 'CREDIT_COMMITTEE' },
      ],
    });
  }

  console.log('Seeding regulatory parameter history (RBZ interest rate cap)...');
  const existingCaps = await prisma.regulatoryParameter.count({ where: { key: 'MAX_INTEREST_RATE' } });
  if (existingCaps === 0) {
    const supersededFrom = daysAgo(180);
    const supersededTo = daysAgo(30);
    await prisma.regulatoryParameter.create({
      data: { key: 'MAX_INTEREST_RATE', value: 0.12, currency: 'ZIG', effectiveFrom: supersededFrom, effectiveTo: supersededTo, createdBy: admin.id, createdAt: supersededFrom },
    });
    await prisma.regulatoryParameter.create({
      data: { key: 'MAX_INTEREST_RATE', value: 0.1, currency: 'ZIG', effectiveFrom: supersededTo, createdBy: admin.id, createdAt: supersededTo },
    });
    await prisma.regulatoryParameter.create({
      data: { key: 'MAX_INTEREST_RATE', value: 0.06, currency: 'USD', effectiveFrom: daysAgo(120), createdBy: admin.id, createdAt: daysAgo(120) },
    });
  }

  console.log('Seeding original demo client (Tendai Moyo)...');
  await seedClient({
    clientNumber: 'CL-000001',
    nationalIdPlain: '63-123456A78',
    firstName: 'Tendai',
    lastName: 'Moyo',
    dateOfBirth: '1990-04-12',
    phone: '+263771234567',
    email: 'tendai.moyo@example.com',
    status: 'PROSPECT',
    addressLine: '12 Samora Machel Ave',
    city: 'Harare',
    province: 'Harare',
    kinName: 'Chipo Moyo',
    kinRelationship: 'Sister',
    kinPhone: '+263779876543',
    branchId: branch.id,
  });

  await ensureKycBucket();

  // ---------------------------------------------------------------------
  // Rich demo scenario — more clients across the status lifecycle, and
  // loan applications spanning every stage (draft approvals, rejection,
  // active with repayments, arrears, write-off, pending disbursement) so
  // the dashboard and every list page have something real to show.
  // Guarded on CL-000002 so `prisma db seed` stays safe to re-run.
  // ---------------------------------------------------------------------
  const alreadySeeded = await prisma.client.findUnique({ where: { clientNumber: 'CL-000002' } });
  if (alreadySeeded) {
    console.log('Rich demo scenario already seeded — skipping.');
  } else {
    console.log('Seeding additional demo clients...');
    const farai = await seedClient({
      clientNumber: 'CL-000002', nationalIdPlain: '63-234567B12', firstName: 'Farai', lastName: 'Chikwanha',
      dateOfBirth: '1988-02-18', phone: '+263772345678', email: 'farai.chikwanha@example.com', status: 'UNDER_REVIEW',
      addressLine: '45 Nelson Mandela Ave', city: 'Harare', province: 'Harare',
      kinName: 'Tafara Chikwanha', kinRelationship: 'Brother', kinPhone: '+263772345679', branchId: branch.id,
      actor: loanOfficer,
    });
    const rutendo = await seedClient({
      clientNumber: 'CL-000003', nationalIdPlain: '08-345678C34', firstName: 'Rutendo', lastName: 'Sibanda',
      dateOfBirth: '1993-07-02', phone: '+263773456789', email: 'rutendo.sibanda@example.com', status: 'ACTIVE',
      addressLine: '9 Fife Ave', city: 'Bulawayo', province: 'Bulawayo',
      kinName: 'Nomsa Sibanda', kinRelationship: 'Mother', kinPhone: '+263773456780', branchId: branch.id,
      actor: loanOfficer,
    });
    const tapiwa = await seedClient({
      clientNumber: 'CL-000004', nationalIdPlain: '63-456789D56', firstName: 'Tapiwa', lastName: 'Ncube',
      dateOfBirth: '1985-11-23', phone: '+263774567890', email: 'tapiwa.ncube@example.com', status: 'ACTIVE',
      addressLine: '21 Robert Mugabe Rd', city: 'Harare', province: 'Harare',
      kinName: 'Sekai Ncube', kinRelationship: 'Spouse', kinPhone: '+263774567891', branchId: branch.id,
      actor: loanOfficer,
    });
    const blessing = await seedClient({
      clientNumber: 'CL-000005', nationalIdPlain: '63-567890E78', firstName: 'Blessing', lastName: 'Mutasa',
      dateOfBirth: '1991-05-30', phone: '+263775678901', email: 'blessing.mutasa@example.com', status: 'ACTIVE',
      addressLine: '3 Josiah Tongogara St', city: 'Mutare', province: 'Manicaland',
      kinName: 'Tatenda Mutasa', kinRelationship: 'Brother', kinPhone: '+263775678902', branchId: branch.id,
      actor: loanOfficer,
    });
    const chiedza = await seedClient({
      clientNumber: 'CL-000006', nationalIdPlain: '63-678901F90', firstName: 'Chiedza', lastName: 'Gumbo',
      dateOfBirth: '1980-09-14', phone: '+263776789012', email: 'chiedza.gumbo@example.com', status: 'ACTIVE',
      addressLine: '77 Herbert Chitepo St', city: 'Gweru', province: 'Midlands',
      kinName: 'Farai Gumbo', kinRelationship: 'Spouse', kinPhone: '+263776789013', branchId: branch.id,
      actor: loanOfficer,
    });
    const kudzai = await seedClient({
      clientNumber: 'CL-000007', nationalIdPlain: '63-789012G12', firstName: 'Kudzai', lastName: 'Marufu',
      dateOfBirth: '1996-01-08', phone: '+263777890123', email: 'kudzai.marufu@example.com', status: 'ACTIVE',
      addressLine: '15 Kaguvi St', city: 'Harare', province: 'Harare',
      kinName: 'Rudo Marufu', kinRelationship: 'Sister', kinPhone: '+263777890124', branchId: branch.id,
      actor: loanOfficer,
    });
    const simbarashe = await seedClient({
      clientNumber: 'CL-000008', nationalIdPlain: '63-901234I56', firstName: 'Simbarashe', lastName: 'Dube',
      dateOfBirth: '1987-03-27', phone: '+263779012345', email: 'simbarashe.dube@example.com', status: 'ACTIVE',
      addressLine: '5 Leopold Takawira St', city: 'Harare', province: 'Harare',
      kinName: 'Melody Dube', kinRelationship: 'Spouse', kinPhone: '+263779012346', branchId: branch.id,
      actor: loanOfficer,
    });
    const nyasha = await seedClient({
      clientNumber: 'CL-000009', nationalIdPlain: '63-890123H34', firstName: 'Nyasha', lastName: 'Chirwa',
      dateOfBirth: '1994-12-05', phone: '+263778901234', email: 'nyasha.chirwa@example.com', status: 'DORMANT',
      addressLine: '30 Enterprise Rd', city: 'Harare', province: 'Harare',
      kinName: 'Tawanda Chirwa', kinRelationship: 'Father', kinPhone: '+263778901235', branchId: branch.id,
      actor: loanOfficer,
    });
    const tinashe = await seedClient({
      clientNumber: 'CL-000010', nationalIdPlain: '63-012345J78', firstName: 'Tinashe', lastName: 'Gwenzi',
      dateOfBirth: '1992-06-19', phone: '+263770123456', email: 'tinashe.gwenzi@example.com', status: 'ACTIVE',
      addressLine: '60 Second St', city: 'Harare', province: 'Harare',
      kinName: 'Panashe Gwenzi', kinRelationship: 'Sister', kinPhone: '+263770123457', branchId: branch.id,
      actor: loanOfficer,
    });
    await seedClient({
      clientNumber: 'CL-000011', nationalIdPlain: '63-111213K90', firstName: 'Rumbidzai', lastName: 'Mapfumo',
      dateOfBirth: '1998-08-21', phone: '+263771213141', email: 'rumbidzai.mapfumo@example.com', status: 'PROSPECT',
      addressLine: '18 Chinhoyi St', city: 'Harare', province: 'Harare',
      kinName: 'Tapiwa Mapfumo', kinRelationship: 'Brother', kinPhone: '+263771213142', branchId: branch.id,
      actor: loanOfficer,
    });

    console.log('Seeding opening capital injection...');
    const capitalDate = daysAgo(210);
    const equityId = await glAccountId(GL.EQUITY);
    const cashId0 = await glAccountId(GL.CASH);
    await postGLEntry({
      reference: `JE-${Date.now() - 2}`,
      description: 'Opening capital injection — ZiG',
      period: periodOf(capitalDate),
      actor: admin,
      postedAt: capitalDate,
      lines: [
        { glAccountId: cashId0, debit: 20000, currency: 'ZIG', narrative: 'Shareholder capital contribution' },
        { glAccountId: equityId, credit: 20000, currency: 'ZIG', narrative: 'Paid-in capital' },
      ],
    });
    await postGLEntry({
      reference: `JE-${Date.now() - 1}`,
      description: 'Opening capital injection — USD',
      period: periodOf(capitalDate),
      actor: admin,
      postedAt: capitalDate,
      lines: [
        { glAccountId: cashId0, debit: 40000, currency: 'USD', narrative: 'Shareholder capital contribution' },
        { glAccountId: equityId, credit: 40000, currency: 'USD', narrative: 'Paid-in capital' },
      ],
    });

    console.log('Seeding loan applications, approvals, disbursements...');

    // 1. Rutendo — healthy active loan with two repayments made.
    {
      const app = await createApplication({ clientId: rutendo.id, productId: salaryProduct.id, principal: 2000, tenorMonths: 6, requiredLevel: 'LOAN_OFFICER', actor: loanOfficer });
      const approved = await decide(app, 'LOAN_OFFICER', 'APPROVED', loanOfficer);
      const account = await createLoanAccount(approved, salaryProduct, backOffice);
      await disburseLoanAccount(account, rutendo, salaryProduct, 2000, 6, 75, backOffice);
      await recordRepayment(account, rutendo, 360, 45, backOffice);
      await recordRepayment(account, rutendo, 360, 15, backOffice);
    }

    // 2. Tapiwa — in arrears, nothing repaid since disbursement.
    {
      const app = await createApplication({ clientId: tapiwa.id, productId: salaryProduct.id, principal: 6000, tenorMonths: 9, requiredLevel: 'BRANCH_MANAGER', actor: loanOfficer });
      const afterOfficer = await decide(app, 'LOAN_OFFICER', 'APPROVED', loanOfficer);
      const approved = await decide(afterOfficer, 'BRANCH_MANAGER', 'APPROVED', branchManager);
      const account = await createLoanAccount(approved, salaryProduct, backOffice);
      await disburseLoanAccount(account, tapiwa, salaryProduct, 6000, 9, 100, backOffice);
      await markArrears(account.id, 35, 'PAR_30', backOffice);
    }

    // 3. Blessing — active USD loan, one repayment made.
    {
      const app = await createApplication({ clientId: blessing.id, productId: smeProduct.id, principal: 10000, tenorMonths: 12, requiredLevel: 'BRANCH_MANAGER', actor: loanOfficer });
      const afterOfficer = await decide(app, 'LOAN_OFFICER', 'APPROVED', loanOfficer);
      const approved = await decide(afterOfficer, 'BRANCH_MANAGER', 'APPROVED', branchManager);
      const account = await createLoanAccount(approved, smeProduct, backOffice);
      await disburseLoanAccount(account, blessing, smeProduct, 10000, 12, 40, backOffice);
      await recordRepayment(account, blessing, 950, 10, backOffice);
    }

    // 4. Chiedza — large USD loan needing full credit committee sign-off, freshly disbursed.
    {
      const app = await createApplication({ clientId: chiedza.id, productId: smeProduct.id, principal: 18000, tenorMonths: 18, requiredLevel: 'CREDIT_COMMITTEE', actor: loanOfficer });
      const afterOfficer = await decide(app, 'LOAN_OFFICER', 'APPROVED', loanOfficer);
      const afterManager = await decide(afterOfficer, 'BRANCH_MANAGER', 'APPROVED', branchManager);
      const approved = await decide(afterManager, 'CREDIT_COMMITTEE', 'APPROVED', creditCommittee);
      const account = await createLoanAccount(approved, smeProduct, backOffice);
      await disburseLoanAccount(account, chiedza, smeProduct, 18000, 18, 20, backOffice);
    }

    // 5. Kudzai — rejected at branch manager level after loan officer approval.
    {
      const app = await createApplication({ clientId: kudzai.id, productId: salaryProduct.id, principal: 3500, tenorMonths: 6, requiredLevel: 'BRANCH_MANAGER', actor: loanOfficer });
      const afterOfficer = await decide(app, 'LOAN_OFFICER', 'APPROVED', loanOfficer);
      await decide(afterOfficer, 'BRANCH_MANAGER', 'REJECTED', branchManager);
    }

    // 6. Simbarashe — disbursed long ago, then written off as a default.
    {
      const app = await createApplication({ clientId: simbarashe.id, productId: salaryProduct.id, principal: 2500, tenorMonths: 6, requiredLevel: 'LOAN_OFFICER', actor: loanOfficer });
      const approved = await decide(app, 'LOAN_OFFICER', 'APPROVED', loanOfficer);
      const account = await createLoanAccount(approved, salaryProduct, backOffice);
      await disburseLoanAccount(account, simbarashe, salaryProduct, 2500, 6, 200, backOffice);
      await writeOffLoan(account, simbarashe, admin);
    }

    // 7. Nyasha — application still awaiting a loan officer decision.
    await createApplication({ clientId: nyasha.id, productId: smeProduct.id, principal: 4000, tenorMonths: 12, requiredLevel: 'BRANCH_MANAGER', actor: loanOfficer });

    // 8. Farai — partially through the approval chain (awaiting branch manager).
    {
      const app = await createApplication({ clientId: farai.id, productId: salaryProduct.id, principal: 4000, tenorMonths: 6, requiredLevel: 'BRANCH_MANAGER', actor: loanOfficer });
      await decide(app, 'LOAN_OFFICER', 'APPROVED', loanOfficer);
    }

    // 9. Tinashe — approved and ready to disburse, but not yet actioned.
    {
      const app = await createApplication({ clientId: tinashe.id, productId: salaryProduct.id, principal: 2200, tenorMonths: 5, requiredLevel: 'LOAN_OFFICER', actor: loanOfficer });
      const approved = await decide(app, 'LOAN_OFFICER', 'APPROVED', loanOfficer);
      await createLoanAccount(approved, salaryProduct, backOffice);
    }

    console.log('Seeding manual journal entries...');
    const cashId = await glAccountId(GL.CASH);
    const expenseId = await glAccountId(GL.EXPENSE);

    // Approved manual entry — office rent, maker/checker satisfied (mirrors the
    // real create-then-approve flow so the audit trail shows both steps).
    const rentDate = daysAgo(10);
    const rentEntry = await prisma.gLEntry.create({
      data: {
        reference: `JE-${Date.now()}`,
        description: 'Office rent — Harare Head Office',
        period: periodOf(rentDate),
        status: 'PENDING_APPROVAL',
        makerId: backOffice.id,
        createdAt: rentDate,
        lines: {
          create: [
            { glAccountId: expenseId, debit: 800, credit: 0, currency: 'USD', narrative: 'Monthly rent' },
            { glAccountId: cashId, debit: 0, credit: 800, currency: 'USD', narrative: 'Paid from operating account' },
          ],
        },
      },
    });
    await auditLog({ entityType: 'GLEntry', entityId: rentEntry.id, action: 'CREATE', actor: backOffice, after: rentEntry, createdAt: rentDate });
    const approvedRentEntry = await prisma.gLEntry.update({
      where: { id: rentEntry.id },
      data: { status: 'POSTED', checkerId: admin.id, postedAt: rentDate },
    });
    await auditLog({
      entityType: 'GLEntry', entityId: rentEntry.id, action: 'APPROVE', actor: admin,
      before: { status: 'PENDING_APPROVAL' }, after: { status: approvedRentEntry.status }, createdAt: rentDate,
    });

    // Pending manual entry — still awaiting a second approver.
    const utilityDate = new Date();
    const utilityEntry = await prisma.gLEntry.create({
      data: {
        reference: `JE-${Date.now() + 1}`,
        description: 'Utility bills — August',
        period: periodOf(utilityDate),
        status: 'PENDING_APPROVAL',
        makerId: backOffice.id,
        lines: {
          create: [
            { glAccountId: expenseId, debit: 220, credit: 0, currency: 'USD', narrative: 'ZESA + water' },
            { glAccountId: cashId, debit: 0, credit: 220, currency: 'USD', narrative: 'Paid from operating account' },
          ],
        },
      },
    });
    await auditLog({ entityType: 'GLEntry', entityId: utilityEntry.id, action: 'CREATE', actor: backOffice, after: utilityEntry });

    console.log('Closing historical accounting periods...');
    const twoMonthsAgo = periodOf(daysAgo(60));
    const threeMonthsAgo = periodOf(daysAgo(90));
    for (const period of [threeMonthsAgo, twoMonthsAgo]) {
      await prisma.accountingPeriod.upsert({
        where: { period },
        update: {},
        create: { period, status: 'CLOSED', closedBy: admin.id, closedAt: new Date() },
      });
    }
  }

  console.log('Seed complete. Demo user password:', DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
