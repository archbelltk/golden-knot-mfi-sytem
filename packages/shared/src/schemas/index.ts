import { z } from "zod";
import {
  AddressType,
  ApprovalDecision,
  ApprovalLevel,
  Channel,
  ClientStatus,
  Currency,
  InterestType,
  KycDocType,
  RepaymentFrequency,
  Role,
  ScreeningResult,
  ScreeningType,
} from "../enums/index";

// Preserves the literal union type (e.g. "PROSPECT" | "ACTIVE" | ...) instead of
// widening to `string`, so values parsed by the resulting z.enum() stay structurally
// assignable to Prisma's generated enum types without casts at every call site.
const enumValues = <T extends Record<string, string>>(e: T) =>
  Object.values(e) as unknown as [T[keyof T], ...T[keyof T][]];

export const moneyAmount = z.coerce.number().positive().finite();
export const rateValue = z.coerce.number().min(0).max(1);

export const createClientSchema = z.object({
  nationalId: z.string().min(3).max(32),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.coerce.date(),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().nullable(),
  employmentInfo: z
    .object({
      employer: z.string().optional(),
      monthlyIncome: z.coerce.number().nonnegative().optional(),
      source: z.string().optional(),
    })
    .partial()
    .optional(),
  branchId: z.string().uuid(),
  groupId: z.string().uuid().optional().nullable(),
  address: z.object({
    type: z.enum(enumValues(AddressType)),
    line1: z.string().min(1),
    city: z.string().min(1),
    province: z.string().min(1),
  }),
  nextOfKin: z.object({
    fullName: z.string().min(1),
    relationship: z.string().min(1),
    phone: z.string().min(6),
  }),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const clientStatusChangeSchema = z.object({
  status: z.enum(enumValues(ClientStatus)),
  reason: z.string().min(1).max(500).optional(),
});
export type ClientStatusChangeInput = z.infer<typeof clientStatusChangeSchema>;

export const complianceRecordSchema = z.object({
  screeningType: z.enum(enumValues(ScreeningType)),
  result: z.enum(enumValues(ScreeningResult)),
  notes: z.string().max(1000).optional(),
});
export type ComplianceRecordInput = z.infer<typeof complianceRecordSchema>;

export const kycDocumentSchema = z.object({
  docType: z.enum(enumValues(KycDocType)),
  storageKey: z.string().min(1),
});
export type KycDocumentInput = z.infer<typeof kycDocumentSchema>;

export const feeScheduleItemSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["FLAT", "PERCENT_OF_PRINCIPAL"]),
  amount: z.coerce.number().nonnegative(),
});

export const createLoanProductSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(30),
  currency: z.enum(enumValues(Currency)),
  interestType: z.enum(enumValues(InterestType)),
  interestRate: rateValue,
  feeSchedule: z.array(feeScheduleItemSchema).default([]),
  minTenorMonths: z.coerce.number().int().positive(),
  maxTenorMonths: z.coerce.number().int().positive(),
  repaymentFrequency: z.enum(enumValues(RepaymentFrequency)),
  gracePeriodDays: z.coerce.number().int().nonnegative().default(0),
});
export type CreateLoanProductInput = z.infer<typeof createLoanProductSchema>;

// `code` is the immutable business key (referenced by seed data/reports); every
// other config field is safe to edit in place because LoanAccount snapshots
// currency/interestRate/interestType/tenor/etc. at application time, so edits
// here only affect future applications, never disbursed loans.
export const updateLoanProductSchema = createLoanProductSchema
  .omit({ code: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });
export type UpdateLoanProductInput = z.infer<typeof updateLoanProductSchema>;

export const createLoanApplicationSchema = z.object({
  clientId: z.string().uuid(),
  productId: z.string().uuid(),
  requestedPrincipal: moneyAmount,
  requestedTenorMonths: z.coerce.number().int().positive(),
  // Mandatory disclosure per SRS 3.1.4 / 3.2.2: the loan officer must show the
  // client the computed effective rate, fees, and total cost of credit before
  // a loan application can be recorded.
  acknowledgeDisclosure: z.literal(true, {
    errorMap: () => ({ message: 'The client must acknowledge the loan disclosure before this application can be submitted' }),
  }),
});
export type CreateLoanApplicationInput = z.infer<typeof createLoanApplicationSchema>;

export const loanDisclosurePreviewSchema = z.object({
  productId: z.string().uuid(),
  principal: moneyAmount,
  tenorMonths: z.coerce.number().int().positive(),
});
export type LoanDisclosurePreviewInput = z.infer<typeof loanDisclosurePreviewSchema>;

export const loanApplicationDecisionSchema = z.object({
  level: z.enum(enumValues(ApprovalLevel)),
  decision: z.enum(enumValues(ApprovalDecision)),
  comment: z.string().max(1000).optional(),
});
export type LoanApplicationDecisionInput = z.infer<typeof loanApplicationDecisionSchema>;

export const disburseLoanSchema = z.object({
  channel: z.enum(enumValues(Channel)),
  reference: z.string().max(100).optional(),
  disbursementDate: z.coerce.date(),
});
export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>;

export const recordRepaymentSchema = z.object({
  amount: moneyAmount,
  channel: z.enum(enumValues(Channel)),
  reference: z.string().max(100).optional(),
  paidAt: z.coerce.date(),
});
export type RecordRepaymentInput = z.infer<typeof recordRepaymentSchema>;

export const journalEntryLineSchema = z
  .object({
    glAccountId: z.string().uuid(),
    debit: z.coerce.number().nonnegative().default(0),
    credit: z.coerce.number().nonnegative().default(0),
    narrative: z.string().max(255).optional(),
  })
  .refine((line) => (line.debit > 0) !== (line.credit > 0), {
    message: "Each line must be either a debit or a credit, not both or neither",
  });

export const createJournalEntrySchema = z
  .object({
    description: z.string().min(1).max(255),
    period: z.string().regex(/^\d{4}-\d{2}$/, "period must be YYYY-MM"),
    currency: z.enum(enumValues(Currency)),
    lines: z.array(journalEntryLineSchema).min(2),
  })
  .refine(
    (entry) => {
      const debit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
      const credit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
      return Math.abs(debit - credit) < 0.005;
    },
    { message: "Total debits must equal total credits" }
  );
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

export const createRegulatoryParameterSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  currency: z.enum(enumValues(Currency)).optional().nullable(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
});
export type CreateRegulatoryParameterInput = z.infer<typeof createRegulatoryParameterSchema>;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(150),
  role: z.enum(enumValues(Role)),
  branchId: z.string().uuid().optional().nullable(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(150).optional(),
  role: z.enum(enumValues(Role)).optional(),
  branchId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const createApprovalThresholdSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  currency: z.enum(enumValues(Currency)).optional().nullable(),
  minAmount: moneyAmount,
  maxAmount: z.coerce.number().positive().finite().optional().nullable(),
  requiredLevel: z.enum(enumValues(ApprovalLevel)),
});
export type CreateApprovalThresholdInput = z.infer<typeof createApprovalThresholdSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
