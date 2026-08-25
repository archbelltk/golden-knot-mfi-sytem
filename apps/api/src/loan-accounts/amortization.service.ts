import { Injectable } from '@nestjs/common';
import { InterestType, RepaymentFrequency } from '@golden-knot/shared';

export interface ScheduleLineDraft {
  installmentNumber: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  feesDue: number;
}

interface FeeScheduleItem {
  type: 'FLAT' | 'PERCENT_OF_PRINCIPAL';
  amount: number;
}

const FREQUENCY_DAYS: Record<RepaymentFrequency, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

/**
 * `interestRate` on LoanProduct/LoanAccount is a monthly rate (e.g. 0.05 = 5%/month),
 * consistent with how Zimbabwean MFI products are typically quoted. Schedules for
 * non-monthly frequencies pro-rate that monthly rate by the number of days per period.
 */
@Injectable()
export class AmortizationService {
  generateSchedule(params: {
    principal: number;
    monthlyRate: number;
    tenorMonths: number;
    interestType: InterestType;
    repaymentFrequency: RepaymentFrequency;
    disbursementDate: Date;
    feeSchedule: FeeScheduleItem[];
  }): ScheduleLineDraft[] {
    const {
      principal,
      monthlyRate,
      tenorMonths,
      interestType,
      repaymentFrequency,
      disbursementDate,
    } = params;

    const periodDays = FREQUENCY_DAYS[repaymentFrequency];
    const periodsPerMonth = 30 / periodDays;
    const numPeriods = Math.round(tenorMonths * periodsPerMonth);
    const periodRate = monthlyRate / periodsPerMonth;

    const totalFees = params.feeSchedule.reduce(
      (sum, f) =>
        sum + (f.type === 'FLAT' ? f.amount : (f.amount / 100) * principal),
      0,
    );

    const lines: ScheduleLineDraft[] = [];

    if (interestType === InterestType.FLAT) {
      const totalInterest = principal * periodRate * numPeriods;
      const principalPerPeriod = principal / numPeriods;
      const interestPerPeriod = totalInterest / numPeriods;

      for (let i = 1; i <= numPeriods; i++) {
        lines.push({
          installmentNumber: i,
          dueDate: addDays(disbursementDate, periodDays * i),
          principalDue: round2(principalPerPeriod),
          interestDue: round2(interestPerPeriod),
          feesDue: i === 1 ? round2(totalFees) : 0,
        });
      }
    } else {
      const payment =
        periodRate === 0
          ? principal / numPeriods
          : (principal * periodRate) /
            (1 - Math.pow(1 + periodRate, -numPeriods));

      let balance = principal;
      for (let i = 1; i <= numPeriods; i++) {
        const interest = balance * periodRate;
        const principalComponent =
          i === numPeriods ? balance : payment - interest;
        balance -= principalComponent;

        lines.push({
          installmentNumber: i,
          dueDate: addDays(disbursementDate, periodDays * i),
          principalDue: round2(principalComponent),
          interestDue: round2(interest),
          feesDue: i === 1 ? round2(totalFees) : 0,
        });
      }
    }

    return lines;
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
