# Decisions — Audit 2026-08-27

## D-01 — Dùng origin/master làm baseline code

Checkout Windows là ancestor của origin/master nhưng chậm 63 commit và có untracked artifacts. Không reset/clean/pull tự động trên checkout đó. Mọi sửa code được thực hiện trên checkout sạch, branch riêng, CI pass rồi merge master.

## D-02 — Không coi compile/unit green là vận hành hoàn tất

Prisma, TypeScript, Vitest và Next build chỉ là quality gate local/CI. Authenticated walkthrough, database isolation, migration status, backup, runtime HTTP và updater Windows vẫn là điều kiện riêng.

## D-03 — Layout phải có hiệu lực từ active version

`LAYOUT` proposal chỉ được APPLY nếu order chứa đúng một lần toàn bộ module available đang bật. AppShell đọc LAYOUT ACTIVE theo project và chỉ sắp xếp trong registry/capability hiện có; layout không được tự bật module planned hoặc cấp quyền.

## D-04 — AI ngoài Internal phải fail closed

Cho đến khi có adapter `ZWorkspace*` đầy đủ, AI PROJECT không được dùng legacy Internal actions; AI GLOBAL chỉ dùng `get_workspace_overview` aggregate. Không dùng prompt như lớp bảo vệ duy nhất; server boundary chặn cả tạo approval và xác nhận approval cũ.

## D-05 — Payroll chưa được bật

Payroll project-local có preview/governance nhưng chưa có payout/accounting local. Giữ `available: false` và không tạo giao dịch thật. Cần owner quyết định settlement contract trước khi triển khai tiếp.

## D-06 — Demo seed chỉ chạy QA/dev

`seedV2DemoAction` bị chặn khi `NODE_ENV=production`; seed demo không phải bằng chứng workspace vận hành thật.

## D-07 — Không tự deploy clinic

Không chạy migration, updater, backup restore, authenticated login hoặc ghi/xóa nghiệp vụ trên máy clinic nếu chưa có owner chủ động xác nhận và safety gate tương ứng.
