# AI Admin Gateway — Hướng dẫn cho người và AI tiếp quản

## Mục đích

AI Admin Gateway là lớp trợ lý quản trị nội bộ của **Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc**. AI được phép làm nghiệp vụ khi ADMIN ủy quyền, nhưng quyền đó được thực thi bởi server-side permission và action thật của ứng dụng, không dựa vào câu chữ hoặc role do mô hình tự nhận.

> **Tài liệu này mô tả lớp AI LEGACY** (`web/src/app/(app)/tro-ly/agent.ts`, 1 công ty — clinic Hồng
> Phúc). Từ 24/08/2026 có thêm lớp **AI đa công ty (V2)** riêng biệt — AI con theo từng `ZProject`, AI
> Tổng điều phối AI con, hàng đợi `ZAiJob` với chuỗi Plan→Preview→Approve→Execute→**Verify**→Audit đầy
> đủ (`web/src/lib/v2-ai-job-engine.ts`). 2 lớp dùng chung TRIẾT LÝ (preview bắt buộc, audit, risk-based
> approval) nhưng KHÁC CODE PATH hoàn toàn — sửa lớp này không tự động ảnh hưởng lớp kia. Chi tiết lớp V2:
> `.task-memory/multi-company-ai-2026-08-27/07_task_ledger.md` (MC-00..MC-24) và các file trong
> `.task-memory/multi-company-ai-2026-08-27/checks/`.

> Nguyên tắc cốt lõi: **AI không bị cấm nghiệp vụ tuyệt đối; AI bị kiểm soát theo mức rủi ro.** Đọc có thể chạy ngay. Ghi dữ liệu nhạy cảm phải có preview, `AssistantApproval`, xác nhận ADMIN, audit và kiểm tra trạng thái/idempotency phù hợp.

## Luồng xử lý chuẩn

| Giai đoạn | Thành phần | Kết quả |
|---|---|---|
| 1. Nhận yêu cầu | `runAssistantAgent` | Mở hoặc khôi phục `AssistantConversation`, lưu USER turn. |
| 2. Ghép ngữ cảnh | `getAssistantContext`, `BUSINESS_RULES_KNOWLEDGE`, lịch sử phiên, file context | AI có bản đồ nghiệp vụ và số liệu được cấp quyền; parser nghiệp vụ ưu tiên câu USER mới nhất, không lấy preview ASSISTANT cũ làm dữ kiện mới. |
| 3. Chọn tool | `plannerSchema`, `actionNames`, `actionHelp` | Chỉ một action trong whitelist; không viết SQL và không sửa file trực tiếp. |
| 4. Kiểm tra | `validateWrite` hoặc `readAction` | Đối chiếu mã/tên/trạng thái với DB, kiểm quyền server-side và tạo preview. |
| 5. Chờ ADMIN | `createApproval` | Lưu arguments, preview, thời hạn 10 phút, conversationId và trạng thái PENDING. |
| 6. Xác nhận | `confirmAssistantApproval` | Với action `requiredApprovals` = 1 (đa số): gọi server action nghiệp vụ thật, cập nhật APPROVED, ghi audit. Với action L5 (`requiredApprovals` = 2, hiện chỉ `delete_customer`): lần xác nhận đầu ghi `firstApprovedById`, chuyển `PENDING_SECOND`, **CHƯA thực thi** — phải có một ADMIN KHÁC (không được là người vừa xác nhận) xác nhận lần 2 mới thực sự chạy hành động và chuyển APPROVED. (Thêm 29/08/2026, MC-21 — trước đó action L5 bị chặn cứng hoàn toàn, không tạo được preview.) |
| 7. Hủy/hết hạn | `rejectAssistantApproval` hoặc kiểm tra `expiresAt` | REJECTED/EXPIRED ở CẢ giai đoạn PENDING lẫn PENDING_SECOND; không thực hiện mutation. Preview cũ bị thay thế khi có yêu cầu chấm công mới trong cùng phiên. |

Không được bỏ qua bước preview bằng cách gọi trực tiếp Prisma từ planner. Nếu cần thêm tool, phải nối vào cả schema action, prompt help, validate, confirm, audit và test. Banner "Chờ duyệt lần 2" ở đầu `/tro-ly` (chỉ ADMIN, loại trừ người đã duyệt lần 1) là nơi DUY NHẤT hiện tại để một ADMIN khác thấy và xác nhận lần 2 — approval thường chỉ hiện trong hội thoại của người tạo.

## Registry hiện có

| Action | Loại | Quyền/kiểm soát | Nghiệp vụ thật được gọi |
|---|---|---|---|
| `get_business_summary` | Đọc | Snapshot tổng hợp | `getAssistantContext` |
| `get_payroll_row` | Đọc | Tên nhân sự và tháng | `getPayroll` |
| `get_customer_profile` | Đọc nhạy cảm | Chỉ ADMIN; số điện thoại chỉ hiện 5 số cuối | Prisma read qua mã khách |
| `get_debt_summary` | Đọc | Snapshot công nợ | `getAssistantContext` |
| `get_lead_priorities` | Đọc | Dữ liệu khách đang cân nhắc | Prisma read + `summarizeCase` |
| `get_financial_alerts` | Đọc | Cảnh báo tổng hợp | `getFinancialHealthIssues` |
| `prepare_payroll_export` | Đọc/chuẩn bị file | Không sửa DB | Link export bảng lương |
| `bulk_upsert_attendance` | Ghi | ADMIN/MANAGER + preview/approval; upsert theo nhân sự/ngày | `bulkUpsertAttendance` |
| `save_payroll` | Ghi | ADMIN/MANAGER + tháng chưa chốt | `savePayroll` |
| `save_bulk_payroll` | Ghi | ADMIN/MANAGER + tháng chưa chốt | `saveBulkPayroll` |
| `record_payment` | Ghi tiền | Preview/approval; chặn vượt công nợ | `addPayment` |
| `create_follow_up` | Ghi | Preview/approval | `addFollowUp` |
| `create_appointment` | Ghi | Preview/approval | `createAppointment` |
| `update_customer_profile` | Ghi hồ sơ | Chỉ ADMIN; kiểm tra trùng số và mã hóa | `updateCustomer` |
| `delete_customer` | Xóa vĩnh viễn (L5, 2 người duyệt) | Chỉ ADMIN; args bắt buộc `{customerCode, purpose}` (thiếu `purpose` bị từ chối ngay ở preview); preview số lượng liên quan, hoàn kho trong transaction; **cần 2 ADMIN khác nhau xác nhận** (xem bước 6 ở trên) | `deleteCustomerForAgent` |
| `update_consultation_record` | Ghi y khoa | Chỉ ADMIN trong Gateway; tôn trọng rule 24 giờ và case access | `saveConsultationRecord` |
| `create_payment_request` | Ghi chứng từ | Chỉ ADMIN trong Gateway; kể cả khoản nhỏ | `createPaymentRequest` |
| `approve_payment_request` | Duyệt chứng từ | Chỉ ADMIN; chỉ PENDING | `approvePaymentRequest` |
| `reject_payment_request` | Từ chối chứng từ | Chỉ ADMIN; chỉ PENDING và cần lý do | `rejectPaymentRequest` |
| `pay_payment_request` | Ghi sổ tiền | Chỉ chứng từ APPROVED; chỉ một CashTransaction | `markPaymentRequestPaid` |
| `propose_system_change` | Kế hoạch code/cơ chế | Chỉ tạo kế hoạch; không sửa production trực tiếp | Tạo PlanTask + checklist 5 bước |
| `create_work_plan` | Lập kế hoạch nghiệp vụ | ADMIN + preview/approval; tạo nhiệm vụ chính/phụ | Tạo Plan + PlanTask/PlanTask con |

Ngoài nút bấm trên preview, ADMIN có thể nhắn câu xác nhận ngắn như “làm đi”, “xác nhận” hoặc “tiến hành”. Agent chỉ gọi confirm khi approval gần nhất của chính phiên đang là `PENDING`; câu hỏi “đã làm chưa?” chỉ đọc trạng thái thật và không suy đoán từ nội dung chat. |

## Quy tắc dữ liệu nhạy cảm

Hồ sơ khách có `phoneEnc`, `phoneLast5` và `phoneHash`; không đưa số điện thoại đầy đủ vào câu trả lời đọc hồ sơ. Dữ liệu y khoa gồm dị ứng, tiền sử và chống chỉ định; việc sửa phải qua action có quyền `case.clinical`, preview và audit. Xóa khách phải hoàn kho `MaterialUsage` trước khi xóa các bản ghi con, rồi mới xóa Customer trong cùng transaction.

Sổ tư vấn lưu hành chính bổ sung, sinh hiệu, sàng lọc, mong muốn, hiện trạng, kết quả dự tính và chỉ định. Bản ghi được sửa tự do trong 24 giờ; sau đó chỉ ADMIN sửa được và audit phải phân biệt `LATE_UPDATE_CONSULTATION`.

## Quy tắc chứng từ và tiền

`PaymentRequest` là chứng từ gốc, còn `CashTransaction` là dòng tiền phát sinh. Trạng thái chuẩn là `PENDING → APPROVED → PAID`; `REJECTED` kết thúc luồng. Không tạo CashTransaction khi chứng từ còn PENDING hoặc REJECTED. Một PaymentRequest chỉ được liên kết tối đa một CashTransaction. Khoản nhỏ như gói tăm 3.000 đồng vẫn phải lập được đề nghị thanh toán.

Lương và hoa hồng dùng tiền khách thực tế đã thanh toán từng lần, không dùng giá chốt hoặc phần còn nợ. Nhân sự kiêm nhiều vai trò không làm doanh thu trung tâm tăng gấp đôi; phân bổ phối hợp phải theo tỷ lệ đã lưu. `commissionOverride` là điều chỉnh ngoài công thức, không nhập lại hoa hồng tự động.

## Workflow thay đổi code

Khi ADMIN yêu cầu đổi cơ chế hoặc code, chỉ dùng `propose_system_change` nếu chưa có tool nghiệp vụ tương ứng. Sau approval, AI tạo một PlanTask cha và 5 task con:

| Bước | Nội dung bắt buộc |
|---|---|
| 1 | Phân tích schema, action, UI, quyền và phạm vi ảnh hưởng. |
| 2 | Soạn diff để ADMIN xem, nêu migration và rủi ro. |
| 3 | Chạy Prisma validate/generate, TypeScript, test hồi quy và production build. |
| 4 | Backup production; nếu có schema thì dùng `prisma migrate deploy`, không dùng `db push` hoặc reset. |
| 5 | Build/recreate, kiểm tra endpoint/role/luồng thật và chuẩn bị đường lui nếu lỗi. |

AI không được commit secret, sửa container production bằng tay, bỏ qua diff, bỏ qua backup hoặc tuyên bố đã triển khai khi chưa có bằng chứng.

## Đồng nghiệp số và giao diện

`assistant-chat.tsx` hiển thị trạng thái “đang phân tích và chia nhỏ các bước”, timeline các bước đã làm, preview, kết quả và trạng thái chờ. `conversation-actions.ts`/`conversations.ts` cho phép tạo phiên mới, archive phiên cũ và xóa vĩnh viễn một phiên; xóa phiên chỉ xóa message/approval liên quan, không xóa hồ sơ nghiệp vụ.

## Cách thêm tool mới

Trước hết phải tìm server action nghiệp vụ thật và đọc schema/action test của module đó. Sau đó thêm action vào `actionNames`, mô tả vào `actionHelp`, định nghĩa zod schema, thêm nhánh quyền và preview trong `validateWrite`, thêm nhánh thực thi trong `confirmAssistantApproval`, ghi audit, kiểm tra idempotency và thêm test hồi quy. Chạy TypeScript, toàn bộ Vitest và Next production build trước khi commit.

Không đặt API key trong `agent.ts`. AI server-side dùng cấu hình tích hợp hiện có; không gọi LLM từ Client Component và không gửi dữ liệu nhạy cảm không cần thiết vào prompt. `AI_MODEL` là model mặc định; `AI_AGENT_MODEL` có thể trỏ planner sang model reasoning mạnh hơn, ví dụ `deepseek-reasoner`, và phải được truyền qua `docker-compose.yml`.
