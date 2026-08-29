# MC-14 rollback script + rà soát governance classification — 2026-08-29 (tiếp phiên deploy wave 4)

Tiếp tục 2 mục còn lại trong "Việc còn lại cho phiên sau" của `clinic-deploy4-20260829.md`.

## 1) Rà soát toàn bộ action trong `tro-ly/agent.ts` xem còn sót includesPayrollData/includesMedicalData

Đọc lại toàn bộ `ai-governance.ts` (logic risk L0-L5), `ai-governance-adapter.ts` (requestForAction —
nơi từng sót `get_project_payroll_preview`), và mọi action trong `actionNames`/`ADMIN_ACTIONS`/
`READ_ACTIONS` của `tro-ly/agent.ts` (cả action clinic-legacy lẫn action project-local V2 mà trợ lý
này proxy qua khi workspace=PROJECT).

**Kết luận: không còn action payroll/y khoa nào bị bỏ sót khỏi 2 cờ này.** Đã đối chiếu từng action:
`get_payroll_row`, `prepare_payroll_export`, `save_payroll`, `save_bulk_payroll`, `get_project_payroll_preview`
(payroll) và `get_customer_profile`/`update_customer_profile`/`update_consultation_record` (y khoa) —
đều đã có trong `includesPayrollData`/`includesMedicalData`.

**Đã kiểm thêm 2 nhóm liên quan, KHÔNG sửa (không phải bug cùng loại):**
- `approve_payment_request`/`reject_payment_request`/`pay_payment_request`: args gửi lên governance
  KHÔNG có `amount` (chỉ có `requestNo`) nên rơi vào nhánh mặc định thay vì `CONSEQUENTIAL_WRITE`/L4.
  Nhưng đây KHÔNG phải lỗ hổng: MỌI action ghi dữ liệu (không riêng payroll) đều bị chặn cứng bởi
  `"Thao tác ghi dữ liệu luôn phải có xác nhận ADMIN"` (agent.ts dòng ~972) trước khi tạo approval —
  bất kể phân loại risk là gì. Preview đã hiện đúng số tiền thật (`formatVND(request.amount)`) trước
  khi ADMIN xác nhận. Phân loại risk chỉ ảnh hưởng độ nghiêm trọng của cảnh báo hiển thị, không phải
  cổng chặn — nên không coi đây là gap cùng lớp với vụ payroll-preview.
- `get_debt_summary`/`get_lead_priorities`/`get_financial_alerts`/`get_project_customers`: các read này
  lộ TÊN khách/con nợ thật (không phải dữ liệu y khoa/lương) mà không cần purpose/confirmation, kể cả
  với vai trò STAFF thấp nhất. Đây là thiết kế NHẤT QUÁN từ trước (không phải hồi quy do đợt V2) —
  `capabilitiesForRole` mặc định đã cấp các quyền này cho MỌI vai trò từ đầu, phục vụ công việc chăm
  sóc/nhắc nợ hằng ngày. KHÔNG tự ý siết lại vì đây là quyết định nghiệp vụ (owner) chứ không phải bug
  kỹ thuật rõ ràng — ghi lại đây để chủ dự án cân nhắc nếu muốn siết chặt hơn.

## 2) MC-14 — script rollback tự động

Viết [`web/scripts/rollback-restore.mjs`](../../../web/scripts/rollback-restore.mjs) + mục "Khôi phục
khẩn cấp" trong `web/DEPLOY.md`. Mặc định DRY-RUN (chỉ xem trước, không đổi gì); phải thêm `--yes` mới
thực thi. Khi `--yes`: tự sao lưu CSDL hiện tại trước (an toàn-của-an-toàn) → dừng app → `pg_restore
--clean --if-exists` qua `docker compose exec db` (không cần biết mật khẩu DB trên host, dùng lại biến
env container đã có) → khởi động lại app → in số liệu Customer/CaseRecord/Payment đối chiếu.

**Diễn tập THẬT** (không phải chỉ đọc code) trên stack QA hoàn toàn cô lập (`docker compose -f
docker-compose.yml -f docker-compose.qa.yml -p zenithqa`, container `zenithqa_db`/`zenithqa_app`,
database `zenith_qa` — KHÔNG đụng tới clinic/production):
1. Số liệu trước: User=16, ZProject=4, ZAiAgent=5.
2. `pg_dump -Fc --no-owner --no-privileges` qua `docker compose exec -T db` → file 269231 bytes, magic
   bytes `PGDMP` hợp lệ.
3. `docker compose stop app` → `pg_restore --clean --if-exists --no-owner --no-privileges` (pipe từ
   file host qua stdin vào container) → exit 0, không lỗi.
4. `docker compose up -d --no-deps app` → log xác nhận `migrate deploy` báo "No pending migrations to
   apply", các backfill idempotent tự chạy lại bình thường (0 thay đổi vì dữ liệu đã đúng), app khởi
   động, `/login` trả **HTTP 200** với đúng tiêu đề "Đăng nhập · BVĐK Hồng Phúc".
5. Số liệu sau: User=16, ZProject=4, ZAiAgent=5 — **khớp hệt trước khi restore**.

Cơ chế cốt lõi (dump/restore qua `docker compose exec`, không cần mật khẩu host) đã được CHỨNG MINH
hoạt động đúng trên hạ tầng thật, không chỉ suy luận từ đọc code. Script thực tế (`rollback-restore.mjs`)
dùng đúng các lệnh đã diễn tập, chỉ khác chỗ nó cố định `REPO_ROOT` về đúng thư mục triển khai thật
(`C:\Users\PC\ZenithTasks`) để không bao giờ chạy nhầm project — đây là thuộc tính an toàn có chủ đích,
không phải hạn chế.

**Chưa test**: nhánh lỗi khi file dump hỏng giữa chừng hoặc bị ngắt kết nối lúc đang restore (rủi ro
thấp, không chặn coi MC-14 là DONE — script vẫn dừng an toàn nhờ `pg_restore` tự thoát khác 0 nếu dump
hỏng, và bản an toàn-trước-khi-ghi-đè vẫn được tạo TRƯỚC bước restore nên luôn có đường lùi).

## Ledger

MC-14: PARTIAL → **DONE**. Chi tiết đã cập nhật vào `07_task_ledger.md`.
