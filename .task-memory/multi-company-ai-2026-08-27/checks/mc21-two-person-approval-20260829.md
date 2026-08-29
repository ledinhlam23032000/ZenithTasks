# MC-21 — Two-person approval THẬT cho AI dispatcher legacy — 2026-08-29

## Vấn đề
`governanceBlock` (dùng bởi trợ lý AI clinic-legacy, `tro-ly/agent.ts`) trước đây chặn cứng HOÀN TOÀN
mọi action có `requiredApprovals > 1` (L5: xóa, sa thải, đổi quyền, deploy) — kể cả bước TẠO PREVIEW.
Trong thực tế, action L5 DUY NHẤT còn có code path thật trong dispatcher này là `delete_customer`
(termination/permission-change/deploy không có action name tương ứng nào được implement) — nghĩa là
"xóa khách hàng qua AI" trước đây hoàn toàn không dùng được, không phải vì thiếu quyền mà vì code tự
chặn ngay từ đầu.

## Đã sửa
- **Schema (additive, đã apply QA)**: `AssistantApprovalStatus` thêm `PENDING_SECOND`; `AssistantApproval`
  thêm `firstApprovedById`/`firstApprovedAt` (migration `20260829220000_assistant_two_person_approval`).
- **`governanceBlock`**: bỏ refusal cứng `requiredApprovals > 1` — để preview được tạo bình thường.
- **`confirmAssistantApproval`**: tách 2 giai đoạn thật —
  - `PENDING` (lần 1): chỉ người TẠO yêu cầu xác nhận được; nếu `requiredApprovals>1` → chuyển
    `PENDING_SECOND`, ghi `firstApprovedById`, **KHÔNG thực thi**, trả lời rõ "cần 1 ADMIN KHÁC".
  - `PENDING_SECOND` (lần 2): CHO PHÉP admin khác (không giới hạn theo `userId` ban đầu) tìm thấy và
    duyệt — nhưng **từ chối nếu `user.id === firstApprovedById`** (không tự duyệt cả 2 lần). Duyệt thành
    công mới thực sự chạy hành động (xóa thật) → `status: APPROVED`.
  - `rejectAssistantApproval`: mở rộng cho phép hủy ở CẢ 2 giai đoạn.
- **UI tối thiểu**: `listPendingSecondApprovals()` + banner đỏ ở đầu `/tro-ly` (chỉ ADMIN, loại trừ chính
  người đã duyệt lần 1) với nút "Xác nhận lần 2" — trước đây hoàn toàn không có cách nào cho admin thứ 2
  NHÌN THẤY các yêu cầu đang chờ (approval chỉ hiện trong hội thoại của người tạo).
- **Bug liên đới tự phát hiện qua test thật**: `validateWrite`'s `delete_customer` bỏ mất `purpose` khi
  ghi `approval.arguments` — vì `isDelete` trong `ai-governance.ts` có `purposeRequired:true`, việc thiếu
  `purpose` khiến bước CONFIRM (dùng `approval.arguments` đã lưu, không phải args gốc) luôn bị chặn ở
  "cần nêu rõ mục đích" dù preview đã tạo thành công — delete_customer trước đây CHƯA BAO GIỜ thực sự chạy
  hết được vòng đời dù có test hay không, vì trước đây bị chặn sớm hơn (ở bước tạo preview) nên lỗi này
  chưa từng lộ ra. Đã sửa: forward `purpose` từ args gốc (LLM) vào args lưu trong approval; cập nhật prompt
  hệ thống để LLM biết `delete_customer` cần `{customerCode, purpose}` và luôn hỏi lý do nếu chưa nêu.

## Bằng chứng (QA thật, migration đã apply QA)
File mới `two-person-approval.itest.ts` (đặt cạnh `agent.ts`), 1/1 PASS — chuỗi đầy đủ trên 1 Customer
thật tạo riêng cho test:
1. `PENDING` → adminA xác nhận lần 1 → chuyển `PENDING_SECOND`, **khách hàng CHƯA bị xóa**.
2. Chính adminA tự duyệt lần 2 → bị từ chối, khách hàng vẫn còn nguyên.
3. adminB (người khác) xác nhận → khách hàng bị xóa THẬT, `status: APPROVED`, có `AuditLog
   action=DELETE_CUSTOMER`.

## Gate
`prisma validate` OK; `tsc` 0 lỗi; unit **495/495**; integration **40/40** (16 file, +1).

## Chưa làm / lưu ý cho phiên sau
- Migration `20260829220000_assistant_two_person_approval` **CHỈ mới apply QA**, CHƯA apply clinic —
  sẽ đi cùng đợt deploy tổng hợp MC-17..21 (xem MC-22).
- Chưa build UI cho termination/permission-change/deploy vì các action đó KHÔNG có code path thật trong
  dispatcher legacy — nếu sau này thêm, PHẢI đi qua đúng cơ chế `PENDING_SECOND` này, không tự chế luồng
  riêng.

## Ledger
MC-21: TODO -> **DONE**.
