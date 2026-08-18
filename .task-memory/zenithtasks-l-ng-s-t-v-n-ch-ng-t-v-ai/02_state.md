# Project State

- Updated: 2026-08-18 20:25 GMT+7
- Goal: Xây dựng AI Admin Gateway cho Trợ lý AI ADMIN: thực hiện mọi nghiệp vụ được ủy quyền dưới giám sát, có preview/xác nhận/audit, lưu phiên và mở rộng dần tới workflow thay đổi code.
- Current phase: Đã triển khai r6 registry AI lên production; đang hoàn tất hồ sơ bàn giao và kiểm thử smoke cuối.
- Overall status: active

## Đã hoàn thành trong checkpoint này

Đã xác nhận CI của workflow thay đổi code `d815f23` xanh; cập nhật tài liệu r5; sau đó mở rộng registry AI ở `0f81781` và CI của commit này cũng xanh.

Đã thêm tool đọc hồ sơ khách theo mã với số điện thoại chỉ hiện 5 số cuối; tool sửa hồ sơ dùng lại action thật để mã hóa/kiểm tra trùng số; tool xóa hồ sơ chỉ ADMIN, preview trước, hoàn kho vật tư trong transaction rồi mới xóa dữ liệu liên quan và audit.

Đã thêm tool cập nhật Sổ tư vấn qua `saveConsultationRecord`, giữ nguyên các trường không nêu, kiểm tra quyền hồ sơ và tôn trọng rule sửa trong 24 giờ; bản ghi muộn chỉ ADMIN sửa và audit ghi `LATE_UPDATE_CONSULTATION`.

Đã thêm tool lập Đề nghị thanh toán PENDING cho cả khoản nhỏ như gói tăm 3.000đ, cùng tool duyệt, từ chối và ghi sổ đã thanh toán. Các tool đối chiếu trạng thái chứng từ thật; chỉ action PAID tạo CashTransaction EXPENSE thông qua action kế toán hiện hữu.

Đã biến `propose_system_change` thành PlanTask cha có checklist 5 bước: phân tích phạm vi, soạn diff để ADMIN xem, test, backup/migration và triển khai/kiểm tra. Không có thay đổi code production mù.

## Bằng chứng kiểm tra hiện tại

- `pnpm exec prisma validate`: đạt.
- `pnpm exec prisma generate`: đạt.
- `./node_modules/.bin/tsc --noEmit`: đạt.
- Vitest toàn bộ: **46 file, 303/303 test đạt**; test parser chấm công 3/3 và test knowledge map AI đạt.
- Next.js production build: đạt.
- CI GitHub Actions cho `0f81781`: success.
- Repo master hiện có commit tài liệu `b76f7a1` sau commit code `0f81781`.
- Production Windows đã đồng bộ code `0f81781`; image app mới `sha256:fd6bc2244f22046d2060747282082e675a0bc18af03e8e90171434b7beebed8a`; container `zenithtasks-app-1` running.
- Database `zenithtasks-db-1` healthy; Prisma báo 49 migrations và schema up to date; r6 không có migration mới; `/login` HTTP 200.
- Approval preview chấm công thử nghiệm `cmsymwqau00023krzfniimmxm` đã hết hạn và được chuyển từ PENDING sang EXPIRED lúc 12:59; không có Attendance thật được ghi từ preview đó.
- Smoke test trình duyệt bằng phiên ADMIN: Dashboard và `/tro-ly` tải được; lịch sử phiên chấm công và preview 17 ngày hiển thị.
- Bằng chứng chi tiết: `checks/2026-08-18-r6-ai-registry-production.md`.

## Verified facts và rủi ro

Không có migration mới ở r6, không reset database và không dùng `prisma db push`. Không có file khách thật, secret, API key, mật khẩu hay `.env` được commit. Các file untracked cũ trên Windows như `web/pnpm-workspace.yaml`, log build và thư mục QA không thuộc release.

Các tool ghi mới đã được kiểm tra compile/build và test knowledge map, nhưng chưa thực hiện thao tác ghi nghiệp vụ thật qua AI trên production. Lần thử tiếp theo nên dùng hồ sơ/chứng từ test đã xác định rõ, xem preview và chỉ xác nhận sau khi ADMIN kiểm tra.

## Next 3 actions

1. Kiểm tra CI của commit tài liệu `b76f7a1` và giữ GitHub master/production version docs nhất quán; không cần recreate app vì đây chỉ là tài liệu.
2. Nếu anh cho phép, kiểm thử không ghi dữ liệu một câu hỏi AI về khả năng đọc hồ sơ hoặc quy trình chứng từ; sau đó có thể thử một chứng từ test nhỏ theo đúng preview/xác nhận.
3. Tiếp tục mở rộng registry cho các nghiệp vụ còn lại như chi lương/hoa hồng cộng tác viên, quản lý quyền tài khoản, link cổng khách, kho và rollback workflow; mỗi tool phải có server-side permission, preview, approval, audit, idempotency và test hồi quy.

## Files to read first

- `VERSION.md`
- `CHANGELOG.md`
- `checks/2026-08-18-r6-ai-registry-production.md`
- `.task-memory/zenithtasks-l-ng-s-t-v-n-ch-ng-t-v-ai/03_decisions.md`
- `web/src/app/(app)/tro-ly/agent.ts`
- `web/src/lib/assistant.ts`
- `web/prisma/schema.prisma`

## Quality risks

Không dùng giá chốt thay thực thu; không cộng đôi user kiêm nhiệm; không để AI tự ghi đè tiền/lương/y tế/code; không chạy migration production khi chưa backup; không coi template pháp lý là tư vấn pháp lý. Luồng Đề nghị thanh toán và Thu–chi phải có một nguồn ghi sổ, không tạo hai dòng chi cho cùng một phiếu. AI ADMIN phải biết cơ chế vận hành và số liệu được cấp quyền nhưng vẫn phải dùng preview, audit và xác nhận cho thao tác ghi. Workflow thay đổi code phải có diff/test/backup/triển khai, không cho model sửa mù trực tiếp.

## Yêu cầu bắt buộc mới đã ghi nhận

- AI ADMIN là workstream bắt buộc, không bị quên khi chuyển sang finance/accounting.
- Không có nghiệp vụ bị cấm tuyệt đối với AI nếu anh ủy quyền; khác nhau ở mức giám sát và kiểm soát.
- Kế toán phải xem được giấy đề nghị thanh toán, bảng lương, phiếu thu/chi và file xuất theo tháng/trạng thái.
- Khoản chi nhỏ như gói tăm 3.000đ phải lập được đề nghị thanh toán và khi duyệt/chi chỉ sinh đúng một dòng Thu–chi liên kết.
- Các phiên AI, lệnh, preview, approval, kết quả, lỗi và feedback phải được lưu tra cứu được.
