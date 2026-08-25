import { ForbiddenException } from '@nestjs/common';
import { Role, type CurrentUser } from '@golden-knot/shared';

/**
 * LOAN_OFFICER and BRANCH_MANAGER only ever operate within their own branch.
 * ADMIN, BACK_OFFICE, and CREDIT_COMMITTEE (approvals can escalate above
 * branch level) are unrestricted.
 */
const BRANCH_SCOPED_ROLES: string[] = [Role.LOAN_OFFICER, Role.BRANCH_MANAGER];

export function isBranchScoped(actor: CurrentUser): boolean {
  return BRANCH_SCOPED_ROLES.includes(actor.role);
}

/** Returns the branchId to filter list queries by, or undefined for unrestricted roles. */
export function scopedBranchId(
  actor: CurrentUser,
  requestedBranchId?: string,
): string | undefined {
  if (isBranchScoped(actor)) return actor.branchId ?? '__no_branch__';
  return requestedBranchId;
}

/** Throws if a branch-scoped actor tries to access a resource outside their own branch. */
export function assertBranchAccess(
  actor: CurrentUser,
  resourceBranchId: string,
): void {
  if (isBranchScoped(actor) && actor.branchId !== resourceBranchId) {
    throw new ForbiddenException(
      'You do not have access to resources outside your branch',
    );
  }
}
