# Ma trận QA UX ZenithTasks 2026

## Phạm vi và nguyên tắc

Ma trận này là checklist nghiệm thu cho các UX task đã duyệt, loại trừ **Task 11 — tự động áp BOM vật tư**. Vật tư tiếp tục do nhân sự tự rà và tự trừ theo ca thực tế; readiness badge chỉ nhắc việc và không được chặn khóa hồ sơ nếu thiếu vật tư.

Mỗi luồng phải kiểm tra đồng thời ba lớp: giao diện có dẫn đúng next action, server action vẫn kiểm tra capability/role, và audit/dữ liệu lịch sử không bị tính lại ngoài chủ ý.

## Ma trận acceptance

| Luồng | ADMIN/MANAGER | Nhân sự đang làm việc | CTV | Nhân sự đã nghỉ việc | Bằng chứng bắt buộc |
|---|---|---|---|---|---|
| Global Search / alias | Tìm được entity theo mã/tên/trạng thái; route vẫn qua gate | Chỉ thấy kết quả trong scope role | Chỉ thấy customer/case trong cửa sổ 6 tháng | Không đăng nhập/không đọc được kết quả | Search tests, direct URL denial, audit nếu mutation |
| Customer 360 / inbox | Mở được snapshot và next action | CARE xem đúng rail hội thoại | Không áp dụng ngoài portal CTV | Không có quyền | `customer-360` tests, masked phone |
| Tiếp nhận / lịch hẹn | Tìm tên, mã, 5 số cuối; CTV chọn bằng ID | Tạo/sửa theo capability | Không được mở route quản trị | Không được mở route | Reception/appointment regression |
| Hồ sơ điều trị | Financial/clinical/admin tabs theo workspace | Tab và action theo capability | Scope Customer/Cases đúng ID | Bị chặn toàn bộ | Case workspace/readiness/lock tests |
| Thanh toán khách | Payment state machine đúng `PENDING → APPROVED → PAID`; không tạo dòng kép | Chỉ thao tác capability được cấp | Chỉ xem hoa hồng, không ghi sổ | Bị chặn | State transition + cash transaction idempotency |
| PaymentRequest từ lương/CTV/chi phí | Tạo PENDING; ADMIN duyệt rồi mới ghi sổ | Không tự cấp quyền | Không tạo chứng từ | Bị chặn | Source link + approval audit + payment rail links |
| Nghỉ việc | Checklist bàn giao bắt buộc; khóa `active=false`; giữ history | Có thể xem dữ liệu theo policy hiện hành trước khi nghỉ | Không liên quan | Không đăng nhập/không xem dữ liệu | Handoff tests, server denial, audit |
| Thăng chức | Diff role/position/department; ngày hiệu lực trong `StaffRoleHistory.changedAt` | Không tự cấp quyền | Không tự cấp quyền | Không thể tự mở quyền | Promotion tests, audit diff |
| CTV ID/data quality | Lọc thiếu ID/chưa đăng ký; reconcile cần ADMIN và audit | Không được gán ID nếu không có quyền | Portal dùng collaboratorId, mask số điện thoại | Không có portal | Data-quality tests, money unchanged assertion |
| CTV portal | Xem khách/hoa hồng của mình; hết 6 tháng ẩn | Không dùng portal CTV | Có scope 6 tháng, đầy đủ thông tin trừ phone chỉ 5 số cuối | Không áp dụng | Portal scope test, cross-CTV denial |
| Inbox/SLA | Auto-assign CARE, alternative ngoài SLA | Draft localStorage, quick replies, telemetry không PII | Không áp dụng | Không có quyền | Inbox alternatives/telemetry tests |
| Mobile quick bar/dashboard | KPI và queue theo role, không vượt scope | Next action theo workload | Chỉ portal CTV | Không hiển thị dữ liệu | Role-aware UI + direct URL checks |

## Hard gates trước merge/rollout

| Gate | Tiêu chí đạt |
|---|---|
| Type safety | `pnpm exec tsc --noEmit` không lỗi |
| Regression | `pnpm test` xanh; test mới có case permission, scope và money unchanged |
| Production build | `pnpm build` xanh; không lỗi server/client boundary |
| Diff hygiene | `git diff --check` xanh; không có `.env`, file tạm hoặc `web/pnpm-workspace.yaml` |
| Security | Direct URL và server action đều từ chối role không có capability; nghỉ việc bị khóa |
| Finance | Không tự tính lại commission; không tự áp BOM; một PaymentRequest tối đa một CashTransaction |
| Rollout | Feature flag có thể tắt theo nhóm; default chỉ bật nhóm đã qua gate; có đường lui |

## Smoke test sau rollout

ADMIN đăng nhập và kiểm tra dashboard, hồ sơ, bảng lương, PaymentRequest, CTV ID/data-quality, inbox và nhật ký. Một CTV đăng nhập và kiểm tra một khách trong hạn, một khách ngoài hạn, hoa hồng và mask số điện thoại. Một tài khoản nhân sự nghỉ việc phải bị từ chối ngay khi truy cập route cũ. Sau đó kiểm tra `/he-thong`, backup status và migration status trên máy vận hành; không tuyên bố production đã cập nhật nếu chưa có bằng chứng.
