# Workspace layout policy/editor sandbox evidence — 2026-08-26

The project dashboard now includes an Admin-only layout editor using native drag/drop plus explicit Move Up/Move Down controls as a keyboard-accessible fallback. The editor creates a `LAYOUT` config proposal in DRAFT and does not apply changes directly. Planned or disabled modules remain excluded by the pure layout validator.

| Check | Result |
|---|---:|
| Layout policy tests | 2/2 |
| Other AI/workspace/mechanism/payroll targeted tests | 27/27 |
| Targeted total | 29/29 |
| TypeScript | pass |
| Next production build | pass |

This is sandbox evidence only. Runtime keyboard/screen-reader walkthrough, persisted LAYOUT version application, rollback verification and isolated DB migration remain open; P07-T01/T03/T06 are not done and P07-T02 remains review/foundation only.
