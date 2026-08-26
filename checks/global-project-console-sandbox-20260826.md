# Global project console sandbox evidence — 2026-08-26

The `/du-an` console now uses cursor pagination with a page size of 50, bounded search by project code/name, and per-project counts for members, units, mechanisms, tasks, project-local customers and project-local sales. Admin queries all projects; Manager queries only projects with active membership. The page does not load an unbounded project list into memory and makes the current page scope explicit.

Prisma validate/generate, workspace/mechanism/payroll/AI targeted tests (22/22), TypeScript and Next production build passed. No database, clinic runtime or browser session was used. P07-T05 remains review because authenticated runtime, scale data test and global aggregate verification are still open.
