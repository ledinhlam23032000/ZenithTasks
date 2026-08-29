# MC-23 — Mở rộng bộ tool AI con + 1 tính năng AI chủ động — 2026-08-29

## Phát hiện trước khi thêm tool mới
`v2-project-actions.ts` (MC-18, tạo AI con mặc định khi tạo company) đã cấp sẵn `get_project_sales_summary`
trong `toolAllowlist` của AI con — nhưng `dispatchJobTool` (`v2-ai-job-engine.ts`, engine THẬT thực thi
job) chưa từng hỗ trợ action này. Nghĩa là AI con "tưởng có quyền" đọc doanh số nhưng gọi thật sẽ luôn
`UNSUPPORTED_JOB_TOOL_ACTION` — đúng kiểu "cấu hình đẹp nhưng không hoạt động" mà chủ dự án phê bình.
`get_project_payroll_preview` có cùng vấn đề nhưng CHƯA vá trong đợt này (payroll nhạy cảm hơn, để dành
xem xét riêng — xem "Chưa làm" bên dưới).

## Đã thêm vào `dispatchJobTool`
- **`get_project_sales_summary`** (vá lỗ hổng nêu trên): tổng giá trị + đã thu + 10 giao dịch gần nhất,
  dùng đúng logic/format đã có ở bridge legacy (`tro-ly/agent.ts`) để nhất quán.
- **`get_project_debt_summary`** (tool đọc MỚI, giá trị thực tế): công nợ project-local — chỉ tính giao
  dịch `CONFIRMED`/`PAID` (bỏ qua `DRAFT` chưa xác nhận, `CANCELLED` đã huỷ), trả tổng nợ + top 10 con nợ.
  Đối xứng với `get_debt_summary` bên trợ lý AI legacy clinic.
- **`get_ecosystem_debt_alert`** (GLOBAL, tính năng AI CHỦ ĐỘNG): AI Tổng quét công nợ TOÀN BỘ company
  ACTIVE trong 1 lần gọi, tự đánh dấu công ty vượt ngưỡng 5.000.000đ (khớp `getDebtThreshold()` mặc định
  của clinic legacy, không bịa số mới) thay vì phải hỏi từng company riêng lẻ.

## Cập nhật đi kèm
`toolAllowlist` mặc định: CHILD agent (cả 2 nơi tạo — `v2-ai-agent-actions.ts` tạo tay VÀ
`v2-project-actions.ts` tạo tự động khi tạo company) thêm `get_project_sales_summary`/
`get_project_debt_summary`; GLOBAL agent thêm `get_ecosystem_debt_alert`. `v2-ai-agent-policy.ts` thêm
`get_ecosystem_debt_alert` vào `globalAggregateActions` (không cần targetProjectId, giống
`get_child_agent_status`).

## Bằng chứng (QA thật, project cô lập riêng)
File mới `v2-project-debt-tools.itest.ts`, 3/3 PASS. Fixture: 1 sale PAID hết nợ (3tr), 1 sale CONFIRMED
còn nợ 6tr (vượt ngưỡng), 1 sale DRAFT thiếu tiền nhưng chưa xác nhận (2tr):
1. `get_project_sales_summary`: tổng đúng CẢ 3 giao dịch (15tr amount, 7tr đã thu) — doanh số nói chung
   không lọc trạng thái.
2. `get_project_debt_summary`: CHỈ 1 khoản nợ thật (6tr, từ sale CONFIRMED) — sale DRAFT KHÔNG được tính,
   đúng như thiết kế.
3. `get_ecosystem_debt_alert`: company test (nợ 6tr > ngưỡng 5tr) xuất hiện đúng trong cả `alerts` lẫn
   `companies`, giá trị khớp chính xác.

## Gate
`tsc` 0 lỗi; unit **495/495**; integration **43/43** (17 file, +1).

## Chưa làm (ghi lại, không tự mở rộng thêm)
- `get_project_payroll_preview` vẫn CHƯA có trong `dispatchJobTool` dù đã có trong `toolAllowlist` mặc
  định — cùng loại "hứa nhưng chưa làm" như sales_summary từng bị, nhưng payroll là dữ liệu nhạy cảm hơn
  nên để dành quyết định riêng (có thể cần bàn thêm về purpose/confirmation như bên legacy), không tự vá
  trong đợt "1 tool nhỏ, không thêm bừa" này.
- Ngưỡng cảnh báo công nợ (5tr) đang hardcode, không đọc từ `AppSetting` như bên clinic legacy
  (`getDebtThreshold()`) — V2 company chưa có khái niệm setting theo từng company; nếu owner cần cấu hình
  riêng theo company thì đây là việc kế tiếp hợp lý.

## Ledger
MC-23: TODO -> **DONE**. **Hoàn tất cả 7 việc chủ dự án giao (MC-17..MC-23).**
