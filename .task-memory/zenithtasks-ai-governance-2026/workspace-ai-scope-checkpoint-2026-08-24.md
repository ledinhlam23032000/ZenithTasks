# Checkpoint workspace + AI scope — 2026-08-24

## Source of truth

GitHub `master` hiện ở commit `fc8e24482cbf51dae2e2bae53082b7864f4c48b0`. Các mốc gần nhất là `1710820` (Task workspace-local), `41aa7fc` (project membership management), `46642f7` (AI workspace scope) và `fc8e244` (link AI giữ project context trong sidebar).

## Đã có

Dữ liệu clinic legacy tiếp tục là workspace sản phẩm `Nội Bộ`, không backfill và không reset. Dự án dùng `ZProject`, membership active và module registry. Task dùng bảng `ZWorkspaceTask` với `projectId` bắt buộc; create/list/status update đều có server-side project access và isolation test rollback-only đạt `TASK_ISOLATION_PASS`. Admin có thể thêm/tạm dừng membership; Manager không có đường tạo hoặc quản lý toàn cục.

AI có selector `Nội Bộ`/Dự án, conversation/approval có `workspaceKind` và `projectId`, planner không đọc snapshot clinic-global hoặc file context khi ở Project, governance chặn tool thiếu/sai projectId, approval pending/reject/execute và assistant metadata ghi scope. L5 two-person approval vẫn chưa triển khai.

## Bằng chứng test

Prisma validate, tsc, Next production build và 10 unit tests governance đã đạt trong clone sandbox. Máy clinic đã chạy `Sua-Loi.bat` đạt `DA XONG` cho commit `41aa7fc`, migration database báo up to date và `/login` HTTP 200. Commit AI scope `fc8e244` đã push nhưng chưa có bằng chứng updater trên máy clinic sau commit này vì sidecar Windows tạm mất kết nối.

## Việc bắt buộc tiếp theo

Khi máy Windows reconnect, chạy đúng `windows\\Sua-Loi.bat`; chờ dòng `DA XONG`, kiểm tra migration count/status, HTTP `/login`, app log không có runtime error, và chạy regression gate. Không gọi hoàn thành release AI scope trước bước này. Không dùng `db push`, reset migration, down volume hoặc stage `.env`, QA credential, browser profile, uploads, raw clinic data hay `worktrees/`.
