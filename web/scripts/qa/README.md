# Multi-company QA workflow

Các lệnh trong thư mục này chỉ dùng cho **PostgreSQL QA cô lập**, không dùng database clinic hoặc production. Seed là idempotent và chỉ upsert các sentinel `QA-*`; verifier là read-only.

## 1. Điều kiện bắt buộc

Đặt các biến môi trường ở shell/CI QA, không commit hoặc ghi vào log:

```bash
export QA_DATABASE_URL='postgresql://.../zenith_qa'
export QA_CONFIRM=YES
export QA_DEMO_PASSWORD='một-mật-khẩu-QA-dài-hơn-12-ký-tự'
```

Không dùng `DATABASE_URL` production/clinic để thay thế `QA_DATABASE_URL`. Script tự từ chối URL có dấu hiệu clinic/production và từ chối khi thiếu `QA_CONFIRM=YES`.

## 2. Chạy seed và verifier

```bash
cd web
pnpm qa:seed:multi-company
pnpm qa:verify:multi-company | tee ../.task-memory/multi-company-ai-2026-08-27/checks/mc12-qa-verifier-YYYYMMDD.json
```

Không chạy `pnpm db:reset`, `prisma migrate reset` hoặc `db push` trong workflow này. Nếu schema QA chưa có `ZAiAgent`, trước hết phải qua migration review riêng; không tự migrate clinic DB.

Verifier phải trả `ok: true`, `readOnly: true`, `qaOnly: true`, có Company A/B `ACTIVE`, sentinel `DRAFT`/`ARCHIVED`, users/memberships/presets/revoked membership, customer/task project ownership, đúng một child ACTIVE cho từng company ACTIVE và đúng một Global AI ACTIVE aggregate-only.

## 3. Authenticated walkthrough bắt buộc

Thực hiện bằng tài khoản QA tương ứng, lưu request/response status và timestamp vào evidence không chứa password:

| Case | Tài khoản/phạm vi | Expected |
|---|---|---|
| Company A local list/detail | Project Admin A, Sales A, Finance A | Chỉ thấy dữ liệu `QA-COMPANY-A` theo capability; không thấy B. |
| Company B local list/detail | Project Admin B, Viewer B | Chỉ thấy dữ liệu `QA-COMPANY-B`; Viewer không có mutation. |
| Foreign URL | Sales A truy cập route của B | Server deny/fail-closed; không trả bản ghi B. |
| Revoked member | Revoked A truy cập A | Server deny sau membership `active=false`; không fallback Internal. |
| Lifecycle writes | Admin trên DRAFT/ARCHIVED | Domain writes bị deny; dữ liệu/audit vẫn giữ. |
| Export isolation | A export/list và B export/list | Mỗi output chỉ chứa projectId tương ứng; aggregate chỉ mở trong phạm vi được phép. |
| Child AI | Member A/B chọn `/tro-ly?p=<projectId>` | Chỉ child ACTIVE đúng project; tool ngoài allowlist hoặc foreign project bị deny. |
| Global AI | Global Admin chọn `__GLOBAL__` | Chỉ aggregate/target explicit được whitelist; không raw tenant dump và không bypass child policy. |

Mỗi case cần evidence runtime thật từ DB QA hoặc authenticated browser. Pure Vitest/TypeScript/Next build chỉ là prerequisite, không thay thế walkthrough.

Có thể chạy authenticated HTTP walkthrough bằng script versioned (script tự ký session synthetic bằng `AUTH_SECRET` của container, không ghi password và chỉ gửi GET read-only):

```bash
cd web
pnpm qa:walkthrough:auth | tee ../.task-memory/multi-company-ai-2026-08-27/checks/mc13-auth-walkthrough-YYYYMMDD.json
```

Script phải trả `ok: true`. Mỗi route local hợp lệ trả 2xx và có marker nội dung route tương ứng; foreign URL, revoked membership, DRAFT/ARCHIVED và capability-denied route phải không trả nội dung tenant bị yêu cầu. Vì Next.js có thể render `ForbiddenPage` trong App Router với HTTP 200, checker ghi nhận thêm marker `/khong-co-quyen`/header redirect và không dùng status 3xx đơn độc làm tiêu chí. Đây là bằng chứng authenticated HTTP trên QA, không phải bằng chứng production.

## 4. Điều kiện đóng MC-12/MC-13

Chỉ chuyển task sang `done` khi seed chạy thành công, verifier pass, toàn bộ case trên có evidence path, foreign/revoked/DRAFT/ARCHIVED denial đã quan sát được, và checkpoint đã cập nhật ở `02_state.md`, `06_changelog.md`, `07_task_ledger.md`. Nếu thiếu QA database hoặc owner walkthrough, giữ trạng thái `PARTIAL/BLOCKED`.
