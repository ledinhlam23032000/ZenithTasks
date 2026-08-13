# Financial and data-integrity audit

## Positive evidence

- Payment creation requires a positive amount and uses a transaction with case locking/recalculation.
- The repository has unit tests for case math, service BOM, stock-in, permissions, and related calculations; 233 tests passed in the runtime image.
- The live local database had one material, zero negative-stock rows, zero photos, zero documents, and zero NPS rows at audit time. This is a snapshot, not proof that the unsafe paths cannot create bad data.

## Release-blocking risks

### Inventory consumption is not shortage-safe

`applyBomTx` calculates BOM needs and decrements stock for every need. It does not reject or explicitly authorize a shortage before creating usage and an OUT movement. A service can therefore consume more stock than exists.

### Service/case removal can permanently lose stock accounting

Deleting a BOM-backed `CaseService` removes the service row but does not reverse the BOM-generated usage and stock movement. Deleting a case cascades child data but does not restore the stock already consumed. This makes the inventory ledger diverge from reality.

### Child-row ownership is not consistently enforced

Several actions use a caller-supplied `caseId` for lock/recalculation and a separate child `id` for mutation. They need a single query predicate such as `where: { id, caseId }` before update/delete.

### Debt-plan invariant is incomplete

`saveDebtPlan` verifies that the case exists but does not reject a zero/negative debt balance before creating a debt plan. This may be a deliberate business policy, but the code comment says the case must still owe money, so the implementation and invariant disagree.

## Required invariants

1. A stock OUT movement must have an auditable source and cannot silently create an unintended negative balance.
2. Removing or editing a BOM-backed service must produce the exact compensating stock movement.
3. Every child mutation must verify its parent in the same authorization query.
4. `paidAmount`, `debtAmount`, service totals, voucher, and case totals must be recalculated atomically.
5. Every payment mutation must be idempotent or protected against double-submit.
6. A debt plan can only exist when debt policy permits it; the rule must be explicit and tested.
7. Deleting a customer/case must follow retention policy and produce a recoverable audit trail, not silently remove clinical history.

