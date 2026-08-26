# Mechanism rule test runner sandbox evidence — 2026-08-26

Added a bounded, project-local rule-test runner for the supported commission contract. Mechanism DRAFT creation now stores up to 50 validated test cases. Admin can explicitly run `TEST_RULE` against a version; the action verifies the version belongs to the active project, records pass/fail aggregate audit and never activates the version automatically.

The Mechanism form now uses the supported `basis`/`rateBps`/`allocation` rule contract and accepts test case JSON. Each version page exposes a separate Test rule action before the existing explicit ACTIVATE action.

| Check | Result |
|---|---:|
| Mechanism rule tests | 3/3 |
| Payroll policy/calculation tests | 5/5 |
| AI governance regression | 11/11 |
| Targeted total | 19/19 |
| TypeScript | pass |
| Next production build | pass |

One initial TypeScript narrowing issue in the parser was corrected before the final gate. No database, clinic runtime, credential or browser session was used. P05-T03 remains `review` because isolated DB and authenticated runtime evidence are still required.
