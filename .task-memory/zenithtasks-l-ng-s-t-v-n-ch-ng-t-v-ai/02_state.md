# Project State

- Updated: 2026-08-18 19:30 GMT+7
- Goal: Xây dựng AI Admin Gateway cho Trợ lý AI ADMIN: thực hiện mọi nghiệp vụ được ủy quyền dưới giám sát, có preview/xác nhận/audit, lưu phiên và mở rộng dần tới workflow thay đổi code.
- Current phase: Release r4 đã triển khai production và kiểm tra preview chấm công; đang mở rộng registry tool và workflow thay đổi code.
- Overall status: active

## Đã hoàn thành trong checkpoint này

Đã rà soát transcript lỗi chấm công và xác định nguyên nhân: Agent chỉ có registry đọc/lương/hồ sơ hẹn, chưa có tool Attendance; khi thiếu tool, planner rơi vào hỏi lại hoặc propose_system_change.

Đã thiết kế AI Admin Gateway theo nguyên tắc không loại bỏ nghiệp vụ tuyệt đối. Tool server tự kiểm tra quyền thật; thao tác đọc chạy ngay, thao tác ghi có preview/xác nhận; xóa, tiền/lương, hồ sơ y tế, quyền tài khoản và thay đổi code sẽ có mức kiểm soát cao hơn, audit và khả năng backup/test/hoàn tác phù hợp.

Đã thêm schema additive `AssistantConversation`, `AssistantMessage`, các enum trạng thái/vai trò, và `conversationId` nullable vào `AssistantApproval`. Đã tạo migration `web/prisma/migrations/20260818120000_ai_admin_gateway/migration.sql` và đã áp dụng trên production.

Đã thêm helper/server action lưu phiên, mở lại phiên OPEN, lưu USER/ASSISTANT turn, archive phiên cũ và tạo phiên mới. UI Trợ lý AI nhận lịch sử từ server, gửi `conversationId`, khôi phục câu trả lời sau khi tải lại, có sidebar phiên gần đây và nút “Cuộc trò chuyện mới”. Approval được liên kết với conversation để giữ preview/kết quả.

Đã thêm `bulkUpsertAttendance`: nhận một nhân sự, danh sách ngày, giờ vào/ra và ghi chú; upsert theo khóa duy nhất nhân sự/ngày trong transaction, ghi audit cho từng bản ghi và revalidate Chấm công/Lương/Kế toán.

Đã thêm parser thuần `attendance-intent.ts` để ghép nhiều lượt hội thoại. Lệnh dạng “Đào Ngọc Trang từ 2/8 đến 18/8/2026 chấm công hộ, sáng 8h, chiều 17h” rồi “chưa nghỉ ngày nào, anh là admin, làm đi” được nhận diện thành một intent 17 ngày, 08:00–17:00, không hỏi lại và tạo preview chấm công hàng loạt.

Đã cập nhật knowledge map và system prompt: không dùng `propose_system_change` thay cho tool nghiệp vụ đã tồn tại; nếu yêu cầu code/cơ chế thì tạo workflow diff → test → backup → triển khai có kiểm soát. AI biết Attendance, Gateway và quy tắc lưu lịch sử.

## Bằng chứng kiểm tra hiện tại

- `pnpm exec prisma validate`: đạt.
- `pnpm exec prisma generate`: đạt, Prisma Client đã sinh lại.
- `./node_modules/.bin/tsc --noEmit`: đạt.
- Vitest toàn bộ: **46 file, 302/302 test đạt**.
- Test parser chấm công: 3/3 đạt; test lịch sử/knowledge hiện có đạt.
- Next.js production build: đạt sau khi thêm schema, Agent, UI, parser và knowledge map.
- Production đã backup `F:\\6.Sao lưu hệ thống\\zenith-2026-08-18_1901.zip` dung lượng 299.196.021 bytes.
- Repo Windows đã đồng bộ `4089825`; image r4 mới là `sha256:b2e76120668593cacef58773e8cd6e3dc3bb2c92be0a129b714ed30d8dba2481`; app đã recreate bằng image này, database healthy.
- Migration `20260818120000_ai_admin_gateway` đã applied lúc `2026-08-18 12:21:44 UTC`; `prisma migrate status` báo 49 migrations, schema up to date; `/login` HTTP 200.
- Browser ADMIN đã tạo đúng preview chấm công 17 ngày, chưa bấm xác nhận nên chưa ghi Attendance thật. Browser extension timeout khi thử nút Hủy; không kết luận Hủy đã chạy.

## Verified facts và rủi ro

HEAD release Gateway đã được commit/push ở `efce179`, tài liệu r4 ở `4089825`; file untracked cũ như `web/pnpm-workspace.yaml` không thuộc release và không được tự ý thêm. Không đưa file khách thật, secret, API key, mật khẩu hoặc `.env` vào repo.

Migration mới chỉ additive, không reset/xóa dữ liệu. `bulkUpsertAttendance` cố ý upsert nên nếu ngày đã có dữ liệu thì cập nhật theo preview, không tạo bản ghi trùng. Approval status ngăn xác nhận lặp.

Lõi Gateway hiện mới mở rộng conversation và chấm công; các tool xóa/sửa hồ sơ, toàn bộ chứng từ, thay đổi code và rollback sẽ tiếp tục được thêm theo registry và workflow riêng, không được tuyên bố đã hoàn thành chỉ vì chấm công đã chạy.

## Next 3 actions

1. Kiểm tra/xử lý approval preview còn PENDING do browser timeout; không ghi dữ liệu thật nếu chưa có xác nhận rõ.
2. Bằng phiên ADMIN, sau khi anh cho phép, kiểm tra một lệnh chấm công thật và tải lại `/tro-ly` để xác nhận lịch sử bền vững.
3. Tiếp tục mở rộng registry tool cho sửa/xóa hồ sơ, chứng từ, lương và workflow code có diff/test/backup; không đánh dấu AI toàn quyền hoàn tất khi các tool chưa có.

## Files to read first

- `UPGRADE-HANDOFF-2026-08.md`
- `.task-memory/zenithtasks-l-ng-s-t-v-n-ch-ng-t-v-ai/01_plan.md`
- `.task-memory/zenithtasks-l-ng-s-t-v-n-ch-ng-t-v-ai/03_decisions.md`
- `web/prisma/schema.prisma`
- `web/prisma/migrations/20260818120000_ai_admin_gateway/migration.sql`
- `web/src/app/(app)/tro-ly/agent.ts`
- `web/src/app/(app)/tro-ly/attendance-intent.ts`
- `web/src/app/(app)/tro-ly/conversations.ts`

## Quality risks

Không dùng giá chốt thay thực thu; không cộng đôi user kiêm nhiệm; không để AI tự ghi đè tiền/lương/y tế/code; không chạy migration production khi chưa backup; không coi template pháp lý là tư vấn pháp lý. Luồng Đề nghị thanh toán và Thu–chi phải có một nguồn ghi sổ, không tạo hai dòng chi cho cùng một phiếu. AI ADMIN phải biết cơ chế vận hành và số liệu được cấp quyền nhưng vẫn phải dùng preview, audit và xác nhận cho thao tác ghi. Workflow thay đổi code phải có diff/test/backup/triển khai, không cho model sửa mù trực tiếp.

## Yêu cầu bắt buộc mới đã ghi nhận

- AI ADMIN là workstream bắt buộc, không bị quên khi chuyển sang finance/accounting.
- Không có nghiệp vụ bị cấm tuyệt đối với AI nếu anh ủy quyền; khác nhau ở mức giám sát và kiểm soát.
- Kế toán phải xem được giấy đề nghị thanh toán, bảng lương, phiếu thu/chi và file xuất theo tháng/trạng thái.
- Khoản chi nhỏ như gói tăm 3.000đ phải lập được đề nghị thanh toán và khi duyệt/chi chỉ sinh đúng một dòng Thu–chi liên kết.
- Các phiên AI, lệnh, preview, approval, kết quả, lỗi và feedback phải được lưu tra cứu được.
