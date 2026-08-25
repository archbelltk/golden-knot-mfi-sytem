import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createHmac, randomBytes, scryptSync } from 'crypto';

const prisma = new PrismaClient();

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

  console.log('Seeding demo loan products...');
  await prisma.loanProduct.upsert({
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
  await prisma.loanProduct.upsert({
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

  console.log('Seeding regulatory parameter (RBZ interest rate cap)...');
  const existingCap = await prisma.regulatoryParameter.findFirst({
    where: { key: 'MAX_INTEREST_RATE', currency: 'ZIG' },
  });
  if (!existingCap) {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@demo.goldenknot.local' } });
    await prisma.regulatoryParameter.create({
      data: {
        key: 'MAX_INTEREST_RATE',
        value: 0.1,
        currency: 'ZIG',
        effectiveFrom: new Date(),
        createdBy: admin.id,
      },
    });
  }

  console.log('Seeding demo client...');
  const demoNationalId = encryptNationalId('63-123456A78');
  await prisma.client.upsert({
    where: { nationalIdHash: demoNationalId.nationalIdHash },
    update: {},
    create: {
      clientNumber: 'CL-000001',
      nationalId: demoNationalId.nationalId,
      nationalIdHash: demoNationalId.nationalIdHash,
      firstName: 'Tendai',
      lastName: 'Moyo',
      dateOfBirth: new Date('1990-04-12'),
      phone: '+263771234567',
      email: 'tendai.moyo@example.com',
      branchId: branch.id,
      status: 'PROSPECT',
      addresses: {
        create: [{ type: 'RESIDENTIAL', line1: '12 Samora Machel Ave', city: 'Harare', province: 'Harare' }],
      },
      nextOfKin: {
        create: [{ fullName: 'Chipo Moyo', relationship: 'Sister', phone: '+263779876543' }],
      },
    },
  });

  await ensureKycBucket();

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
