# Project State

- Updated: 2026-08-18 09:02 GMT+7
- Goal: Nâng cấp AI ADMIN hiểu đầy đủ vận hành và hoàn thiện luồng Đề nghị thanh toán → Thu–chi → Kế toán.
- Current phase: Đã hoàn tất triển khai r3, kiểm tra UI ADMIN và lưu biên bản; nhiệm vụ vẫn có thể mở rộng ở các đợt sau.
- Overall status: completed-for-this-release

## Đã hoàn thành trong checkpoint này

Đã khởi tạo bộ nhớ dài hạn tại `.task-memory/zenithtasks-l-ng-s-t-v-n-ch-ng-t-v-ai/` với brief, plan, state, decisions, sources, open questions và changelog. Các quy tắc anh chốt được lưu thành nguồn sự thật.

Đã hoàn thiện schema/migration additive cho PaymentRequest, ConsultationRecord, StaffAgreement, AssistantFile, AssistantFeedback và commissionOverride. Chưa chạy migration trên máy phòng khám.

Đã cập nhật lương theo Payment thực thu, phân bổ phối hợp, tách hoa hồng tự động và điều chỉnh thủ công. Đã cập nhật bảng lương, modal sửa lương, sửa nhanh cả bảng, action lưu và agent AI.

Đã thêm module giấy đề nghị thanh toán: tạo PENDING, ADMIN duyệt/từ chối, ghi sổ PAID với CashTransaction liên kết, route in Word/HTML; chi lương/CTV tự tạo chứng từ APPROVED liên kết với PayrollEntry/CommissionPayout và hoàn tác sẽ hủy chứng từ.

Đã thêm ConsultationRecord action và form sổ tư vấn: hành chính, sinh hiệu, 18 câu sàng lọc, nút đánh dấu nhanh, mong muốn/hiện trạng/kết quả/chỉ định, xác nhận khách, giới hạn sửa 24 giờ và ADMIN sửa muộn, audit, route in.

Đã thêm StaffAgreement: template bảo mật/không cạnh tranh có snapshot/version, bản nháp, đánh dấu đã ký, thời hạn, thu hồi, route in; giao diện có cảnh báo cần luật sư/lao động rà soát.

Đã thêm AI upload: TXT/CSV/JSON/DOC/DOCX/XLS/XLSX/PDF/ảnh, giới hạn 15MB, trích xuất text bằng mammoth/xlsx/pdf-parse, lưu tối đa 30 ngày, file context vào planner. Đã thêm feedback APPROVAL/CORRECTION/REJECTION, lưu audit, nhập giọng nói Web Speech API với ô gõ dự phòng.

## Bằng chứng kiểm tra hiện tại

- `./node_modules/.bin/tsc --noEmit`: đạt sau các thay đổi liên kết chứng từ và AI knowledge.
- Vitest toàn bộ: **45 file, 299/299 test đạt**; test mới bao phủ metadata khoản chi nhỏ, khóa sửa/xóa dòng đã liên kết và knowledge map của AI.
- Next.js production build: đạt sau phần finance trước khi bổ sung AI knowledge; cần chạy lại build ở checkpoint cuối.
- Prisma migration `20260818100000_finance_consultation_hr_ai` đã áp dụng trên máy vận hành theo checkpoint trước.
- Đã kiểm thử UI production bằng tài khoản ADMIN: `/ke-toan`, `/thu-chi`, `/tro-ly` mở được; Trung tâm chứng từ hiển thị; modal Thu–chi mở và đóng không tạo dữ liệu; AI trả lời đúng cơ chế hoa hồng thực thu và khoản chi 3.000đ.
- Chưa tạo phiếu PAID thật để không làm thay đổi sổ kế toán trong kiểm thử.

## Verified facts và rủi ro

HEAD trước đợt mới là `e45021c`. Repo có một số file untracked cũ; không xóa. Không đưa file khách thật, secret, API key hoặc `.env` vào repo. Các điều khoản không cạnh tranh và mức phạt trong template chỉ là snapshot nội bộ, cần rà soát pháp lý.

## Next 3 actions

1. Khi anh có khoản chi thực tế, dùng luồng Sổ thu–chi → Đề nghị thanh toán → ADMIN duyệt → PAID; không nhập cùng khoản đó trực tiếp lần hai.
2. Có thể kiểm tra bổ sung AI tải file/voice, xuất file kế toán, QR và hộp thư khi thuận tiện.
3. Các đợt nâng cấp sau phải tiếp tục đọc brief/state này; workstream AI ADMIN vẫn là yêu cầu dài hạn bắt buộc.

## Files to read first

- `UPGRADE-HANDOFF-2026-08.md`
- `.task-memory/zenithtasks-l-ng-s-t-v-n-ch-ng-t-v-ai/01_plan.md`
- `web/prisma/schema.prisma`
- `web/prisma/migrations/20260818100000_finance_consultation_hr_ai/migration.sql`
- `web/src/lib/commission-data.ts`
- `web/src/app/(app)/tro-ly/agent.ts`

## Quality risks

Không dùng giá chốt thay thực thu; không cộng đôi user kiêm nhiệm; không để AI tự ghi đè tiền/lương/y tế/code; không chạy migration production khi chưa backup; không coi template pháp lý là tư vấn pháp lý. Luồng Đề nghị thanh toán và Thu–chi phải có một nguồn ghi sổ, không tạo hai dòng chi cho cùng một phiếu. AI ADMIN phải biết cơ chế vận hành và số liệu được cấp quyền nhưng không được bỏ qua preview, audit và xác nhận đối với thao tác ghi.

## Yêu cầu bắt buộc mới đã ghi nhận

- AI ADMIN phải được xem là một workstream bắt buộc, không bị quên khi chuyển sang các phần finance/accounting.
- Kế toán phải xem được giấy đề nghị thanh toán, bảng lương, phiếu thu/chi và các file xuất theo tháng/trạng thái.
- Khoản chi nhỏ như gói tăm 3.000đ phải lập được đề nghị thanh toán và khi duyệt/chi chỉ sinh đúng một dòng Thu–chi liên kết.
