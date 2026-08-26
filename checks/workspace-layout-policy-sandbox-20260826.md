# Workspace layout policy sandbox evidence — 2026-08-26

Added a pure project-local layout validator for a future accessible module ordering UI. It accepts only unique module keys that are both available in the registry and enabled in the selected project. Duplicate, unknown, planned or disabled modules are rejected. Payroll remains blocked because it is not available in the registry.

| Check | Result |
|---|---:|
| Layout policy tests | 2/2 |
| Other AI/workspace/mechanism/payroll targeted tests | 27/27 |
| Targeted total | 29/29 |
| TypeScript | pass |
| Next production build | pass |

This is policy foundation only. Drag/drop keyboard fallback, preview/save/rollback UI, layout config migration/runtime and authenticated testing remain open; P07-T01/T02/T03/T06 are not marked done.
