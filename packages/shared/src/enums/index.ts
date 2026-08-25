export const Role = {
  ADMIN: "ADMIN",
  BACK_OFFICE: "BACK_OFFICE",
  LOAN_OFFICER: "LOAN_OFFICER",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  CREDIT_COMMITTEE: "CREDIT_COMMITTEE",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Currency = {
  ZIG: "ZIG",
  USD: "USD",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const ClientStatus = {
  PROSPECT: "PROSPECT",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACTIVE: "ACTIVE",
  DORMANT: "DORMANT",
  BLACKLISTED: "BLACKLISTED",
} as const;
export type ClientStatus = (typeof ClientStatus)[keyof typeof ClientStatus];

export const CLIENT_STATUS_TRANSITIONS: Record<ClientStatus, ClientStatus[]> = {
  PROSPECT: ["UNDER_REVIEW", "BLACKLISTED"],
  UNDER_REVIEW: ["ACTIVE", "PROSPECT", "BLACKLISTED"],
  ACTIVE: ["DORMANT", "BLACKLISTED"],
  DORMANT: ["ACTIVE", "BLACKLISTED"],
  BLACKLISTED: [],
};

export const RiskTier = {
  STANDARD: "STANDARD",
  ENHANCED: "ENHANCED",
} as const;
export type RiskTier = (typeof RiskTier)[keyof typeof RiskTier];

export const AddressType = {
  RESIDENTIAL: "RESIDENTIAL",
  POSTAL: "POSTAL",
  BUSINESS: "BUSINESS",
} as const;
export type AddressType = (typeof AddressType)[keyof typeof AddressType];

export const KycDocType = {
  NATIONAL_ID: "NATIONAL_ID",
  PASSPORT: "PASSPORT",
  PROOF_OF_ADDRESS: "PROOF_OF_ADDRESS",
  PAYSLIP: "PAYSLIP",
  BANK_STATEMENT: "BANK_STATEMENT",
  BUSINESS_REGISTRATION: "BUSINESS_REGISTRATION",
  SELFIE: "SELFIE",
  OTHER: "OTHER",
} as const;
export type KycDocType = (typeof KycDocType)[keyof typeof KycDocType];

export const VerifiedStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;
export type VerifiedStatus = (typeof VerifiedStatus)[keyof typeof VerifiedStatus];

export const ScreeningType = {
  PEP: "PEP",
  SANCTIONS: "SANCTIONS",
} as const;
export type ScreeningType = (typeof ScreeningType)[keyof typeof ScreeningType];

export const ScreeningResult = {
  CLEAR: "CLEAR",
  POTENTIAL_MATCH: "POTENTIAL_MATCH",
  CONFIRMED_MATCH: "CONFIRMED_MATCH",
} as const;
export type ScreeningResult = (typeof ScreeningResult)[keyof typeof ScreeningResult];

export const InterestType = {
  FLAT: "FLAT",
  REDUCING_BALANCE: "REDUCING_BALANCE",
} as const;
export type InterestType = (typeof InterestType)[keyof typeof InterestType];

export const RepaymentFrequency = {
  WEEKLY: "WEEKLY",
  BIWEEKLY: "BIWEEKLY",
  MONTHLY: "MONTHLY",
} as const;
export type RepaymentFrequency = (typeof RepaymentFrequency)[keyof typeof RepaymentFrequency];

export const ApprovalLevel = {
  LOAN_OFFICER: "LOAN_OFFICER",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  CREDIT_COMMITTEE: "CREDIT_COMMITTEE",
} as const;
export type ApprovalLevel = (typeof ApprovalLevel)[keyof typeof ApprovalLevel];

export const ApprovalDecision = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  RETURNED: "RETURNED",
} as const;
export type ApprovalDecision = (typeof ApprovalDecision)[keyof typeof ApprovalDecision];

export const LoanApplicationStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  PENDING_LOAN_OFFICER: "PENDING_LOAN_OFFICER",
  PENDING_BRANCH_MANAGER: "PENDING_BRANCH_MANAGER",
  PENDING_CREDIT_COMMITTEE: "PENDING_CREDIT_COMMITTEE",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type LoanApplicationStatus =
  (typeof LoanApplicationStatus)[keyof typeof LoanApplicationStatus];

export const LoanAccountStatus = {
  PENDING_DISBURSEMENT: "PENDING_DISBURSEMENT",
  ACTIVE: "ACTIVE",
  ARREARS: "ARREARS",
  WRITTEN_OFF: "WRITTEN_OFF",
  CLOSED: "CLOSED",
} as const;
export type LoanAccountStatus = (typeof LoanAccountStatus)[keyof typeof LoanAccountStatus];

export const ParBucket = {
  CURRENT: "CURRENT",
  PAR_1: "PAR_1",
  PAR_30: "PAR_30",
  PAR_90: "PAR_90",
  NPL: "NPL",
} as const;
export type ParBucket = (typeof ParBucket)[keyof typeof ParBucket];

export const ScheduleLineStatus = {
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
} as const;
export type ScheduleLineStatus = (typeof ScheduleLineStatus)[keyof typeof ScheduleLineStatus];

export const TransactionType = {
  DISBURSEMENT: "DISBURSEMENT",
  REPAYMENT: "REPAYMENT",
  FEE_CHARGE: "FEE_CHARGE",
  WRITE_OFF: "WRITE_OFF",
  MANUAL: "MANUAL",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const Channel = {
  BANK: "BANK",
  MOBILE_WALLET: "MOBILE_WALLET",
  CASH: "CASH",
  VOUCHER: "VOUCHER",
  INTERNAL: "INTERNAL",
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];

export const GLAccountType = {
  ASSET: "ASSET",
  CONTRA_ASSET: "CONTRA_ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;
export type GLAccountType = (typeof GLAccountType)[keyof typeof GLAccountType];

export const GLEntryStatus = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  POSTED: "POSTED",
  REJECTED: "REJECTED",
  REVERSED: "REVERSED",
} as const;
export type GLEntryStatus = (typeof GLEntryStatus)[keyof typeof GLEntryStatus];

export const AuditAction = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  STATUS_CHANGE: "STATUS_CHANGE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  DELETE: "DELETE",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const SubmissionStatus = {
  NOT_GENERATED: "NOT_GENERATED",
  GENERATED: "GENERATED",
  SUBMITTED: "SUBMITTED",
} as const;
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export const PeriodStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type PeriodStatus = (typeof PeriodStatus)[keyof typeof PeriodStatus];
