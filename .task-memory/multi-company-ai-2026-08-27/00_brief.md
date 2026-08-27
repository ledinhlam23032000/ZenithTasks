# Brief — Nền tảng quản lý nhiều công ty con và AI phân cấp

- **Ngày khởi tạo:** 2026-08-27 GMT+7
- **Dự án:** Ứng dụng quản trị Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc
- **Baseline code:** `origin/master` tại `ab86fdc` khi bắt đầu chương trình
- **Mục tiêu:** Xây dựng một phần mềm quản lý nhiều công ty con/đơn vị. Mỗi công ty có tài khoản, nhân viên, khách hàng, lịch hẹn, doanh số, tài chính, cơ chế và quyền riêng; một AI con hoạt động trong đúng phạm vi công ty; một AI Tổng có thể tổng hợp/điều phối cấp hệ thống và giám sát các AI con theo RBAC, approval, audit và isolation.

## Phạm vi bắt buộc

1. Công ty con có lifecycle rõ ràng: tạo, DRAFT, ACTIVE, ARCHIVED/DEACTIVATED, soft-delete và khôi phục có kiểm soát.
2. Người dùng có tài khoản hệ thống và membership theo từng công ty; vai trò, capability, trạng thái active/revoked và nhân viên thuộc đúng công ty.
3. Mọi domain record project-local mang tenant/project boundary; list, detail, lookup, aggregate, export và AI tool đều phải scope theo project.
4. AI con có profile/config/prompt/knowledge/tools riêng theo công ty; không đọc Internal hoặc công ty khác; write luôn preview → approval → audit.
5. AI Tổng có Global context, aggregate/report cross-company đã giới hạn; có thể xem trạng thái và health của AI con, không tự vượt quyền hoặc tự thực hiện L5.
6. Xóa công ty chỉ là soft-delete/archival ở bước đầu, có preview, dependency check, backup/rollback, owner approval, audit và khả năng restore; không hard-delete production mặc định.
7. Có QA seed không PII, test cross-tenant/RBAC/AI scope, authenticated walkthrough và release/backup/migration evidence.

## Tiêu chí thành công cấp sản phẩm

| Tiêu chí | Bằng chứng bắt buộc |
|---|---|
| Tạo company/subsidiary thật | UI + server action + schema + audit + test |
| Mời/tạo tài khoản và gán nhân viên | Auth/RBAC + membership + revoke test + walkthrough |
| Công ty A không thấy dữ liệu B | Synthetic isolation test cho list/detail/aggregate/export/AI |
| AI con đúng phạm vi | Tool registry + workspace context + prompt/data boundary + approval/audit test |
| AI Tổng theo dõi được toàn hệ thống | Global aggregate + AI child health/audit view + role restriction |
| Xóa/khôi phục an toàn | Soft-delete/restore + dependency preview + backup/rollback + owner approval |
| Vận hành ổn định | Prisma/type/test/build + migration status + backup + runtime smoke |

## Không nằm trong phạm vi tự động

Không tự deploy/migrate/xóa dữ liệu thật trên máy clinic, không dùng credential production, không bật payroll payout/accounting khi chưa có source of truth và owner approval, không cho AI tự đổi quyền/deploy/xóa/hủy dữ liệu nhạy cảm.

## Nguồn sự thật

Mã nguồn và migration trên `master` thắng mô tả cũ. Kế hoạch Workspace V4 hiện nằm ở `.task-memory/zenithtasks-ai-governance-2026/01_plan-workspace-v4-60-tasks.md`. Workbook `ZENITH_PLAN_DUY_NHAT_2026.xlsx` theo canonical path chưa được tìm thấy trong sandbox; vì vậy mọi trạng thái chưa có workbook/evidence sẽ ghi `review`, `blocked` hoặc `unknown`, không tự đánh dấu hoàn tất.
