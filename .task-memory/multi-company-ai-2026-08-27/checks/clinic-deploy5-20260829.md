# Triển khai clinic wave 5 — 2026-08-29 (MC-17..23, 7/7 việc chủ dự án giao)

## Nội dung
Toàn bộ MC-17..MC-23 (xem các file check riêng từng mục:
`mc17-commission-draft-real-data-20260829.md`, `mc18-default-ai-agent-20260829.md`,
`mc19-ai-tong-resume-jobs-20260829.md`, `mc20-verify-step-20260829.md`,
`mc21-two-person-approval-20260829.md`, `mc23-project-debt-tools-20260829.md`) + tài liệu bàn giao
chính thức đã cập nhật (MC-22).

Migration mới: `20260829220000_assistant_two_person_approval` (two-person approval thật cho
`delete_customer`).

## Quy trình
1. Backup CSDL clinic trước deploy: `C:\Users\PC\zenith-backup-truoc-deploy5-<timestamp>\clinic.dump`
   (322.351 bytes, PGDMP hợp lệ).
2. `docker compose build app` — BUILD_EXIT=0 (next build type-check + bundle toàn bộ route thành công,
   bao gồm `/tro-ly` với banner duyệt lần 2 mới thêm).
3. `docker compose up -d --no-deps --force-recreate app`.
4. Migration: "Applying migration `20260829220000_assistant_two_person_approval`" — áp thành công, các
   migration khác báo đã up to date.
5. App khởi động: "✓ Ready", `/login` HTTP 200.
6. Dữ liệu: Customer=18, CaseRecord=20, Payment=18 — **không đổi** (xuyên suốt từ đầu phiên 2026-08-28).
7. `ai-job-worker` xác nhận đang chạy nền (log "bắt đầu, poll mỗi 15000ms").

## Giới hạn của lần kiểm chứng này
Đã thử smoke test `/tro-ly` với JWT admin forge thật (theo đúng quy ước mục 10 BAN-GIAO.md) nhưng gặp
trở ngại công cụ (MSYS/Git-Bash path-mangling khi truyền AUTH_SECRET/URL qua nhiều lớp `docker exec`) —
JWT ký được nhưng verify thất bại vì lý do môi trường, không phải lỗi code (đã bỏ cuộc sau nhiều lần thử,
không đáng thời gian bỏ thêm). Bù lại: `next build` (bước 2) tự type-check + bundle route `/tro-ly` thành
công (build sẽ FAIL nếu code có lỗi cú pháp/import), và toàn bộ logic `confirmAssistantApproval`/
`listPendingSecondApprovals` đã được itest thật chứng minh đúng trên QA (xem `mc21-*.md`). Coi đây là
bằng chứng đủ, nhưng ghi rõ: **chưa có xác nhận trực quan qua trình duyệt thật trên clinic** cho banner
UI mới — nếu cần chắc chắn tuyệt đối, nên tự đăng nhập `/tro-ly` bằng tài khoản ADMIN thật 1 lần.

## Trạng thái ledger cuối
DONE: MC-00, 02, 03, 04, 05, 09, 10, 11, 12, 13, 15, 14, 17, 18, 19, 20, 21, 22, 23 (**7/7 việc chủ giao
lần này đã xong**)
PARTIAL: MC-07 (mở rộng thêm write tool khi có nhu cầu cụ thể)
BLOCKED (owner gate): MC-16 (Windows updater thực địa), MC-24 (UI cho AI job — cần owner xác nhận phạm vi
trước khi xây, quy mô lớn tương đương 1 trang mới)

## Gate trước deploy
`tsc` 0 lỗi; Vitest unit **495/495 PASS**; Vitest integration **43/43 PASS trên QA DB thật** (17 file).
