# Sources and evidence

## Internal sources

| Source | Use | Reliability |
|---|---|---|
| `web/prisma/schema.prisma` | Schema hiện hữu của User, Customer, CaseRecord, Collaborator, CommissionPayout, PaymentRequest | Primary source |
| `web/src/lib/permissions.ts` | Nguồn duy nhất RBAC/menu/capability | Primary source |
| `web/src/lib/auth.ts` | JWT session, active account gate, login identity | Primary source |
| `web/src/app/(app)/cong-tac-vien/actions.ts` | Rename/sync CTV cũ và tạo hồ sơ | Primary source |
| `web/src/lib/performance.ts` | Báo cáo CTV đang ghép theo tên | Primary source |
| `web/src/app/(app)/nhan-su/actions.ts` | Tạo/sửa/khóa/xóa nhân sự | Primary source |
| `web/src/lib/case-access.ts` | Helper quyền hồ sơ hiện hữu | Primary source |
| Baseline CI local sandbox | `tsc` đạt; Vitest 52 files/329 tests đạt trước sửa | Verified evidence |
| Feature checks | `tsc` đạt; Vitest 53 files/331 tests đạt; Next build đạt | Verified evidence |

## Known blockers

Canonical workbook `deliverables/ZENITH_PLAN_DUY_NHAT_2026.xlsx` và `UNIFIED_EXECUTION_PLAN.md` không có trong bản clone GitHub. Không chạy production migration vì chưa có backup/owner approval/DB URL trong sandbox.
