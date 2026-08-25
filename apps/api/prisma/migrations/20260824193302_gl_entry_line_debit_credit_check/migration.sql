-- Defense-in-depth: each GL entry line must be a pure debit or a pure credit,
-- never both, never neither. Sum(debit)=sum(credit) per entry is enforced in
-- application code (LedgerPostingService), since that's a cross-row invariant
-- a single-row CHECK cannot express without a trigger.
ALTER TABLE "GLEntryLine"
  ADD CONSTRAINT "GLEntryLine_debit_xor_credit_check"
  CHECK (
    (debit >= 0 AND credit >= 0)
    AND NOT (debit = 0 AND credit = 0)
    AND NOT (debit > 0 AND credit > 0)
  );
