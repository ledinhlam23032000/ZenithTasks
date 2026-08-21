# Project State

- Updated: 2026-08-21 12:15 GMT+7
- Goal: Tích hợp Thu chi với Giấy đề nghị thanh toán và Kế toán, tự điền mẫu và in ký.
- Current phase: P6 — Kiểm thử và rà soát
- Overall status: active

## Completed since last checkpoint

Đã khảo sát schema và route hiện có. Đã đổi khoản Chi trong Thu chi thành nguồn tạo đồng thời PaymentRequest + CashTransaction liên kết; bỏ checkbox nhập lại. Đã bổ sung auto recipient, requester, reason, amount text, HTML A4 preview, route print và Word export. Đã cập nhật Kế toán để xác nhận phiếu đã có cash row mà không tạo trùng, đồng bộ edit trước duyệt, ẩn menu chứng từ riêng và cập nhật các liên kết.

## Verified facts

- Repo dùng Next.js 16 + React 19 + TypeScript + PostgreSQL/Prisma 7 trong `web/`.
- `CashTransaction.paymentRequestId` và relation một-một với `PaymentRequest` đã có sẵn; không cần migration schema cho thay đổi này.
- User có `fullName` và `address`; nếu thiếu địa chỉ, phiếu dùng `Trung tâm Phẫu thuật Tạo hình Thẩm mỹ` làm fallback.
- Mẫu PDF là phiếu A4 gồm Kính gửi, Họ và Tên, Địa chỉ, Lý do, Số tiền, Bằng chữ, ngày Hải Phòng và bốn cột ký.
- `./node_modules/.bin/tsc --noEmit --pretty false`: pass.
- `./node_modules/.bin/next build`: pass, route mới `[id]`, `[id]/print`, `[id]/export` đều được nhận.
- Full Vitest trước test bổ sung: 51 files, 326 tests passed; helper test sau bổ sung: 5 tests passed.

## Active assumptions

- Đơn vị dùng in giấy và ký tay; chưa triển khai chữ ký điện tử.
- “Địa chỉ” trên mẫu là địa chỉ hồ sơ nhân sự; nếu trống dùng tên đơn vị.
- Phiếu auto từ Thu chi được ghi dòng chi ngay vì người dùng yêu cầu chứng từ xuất hiện ngay sau khi mua.

## Open blockers/questions

- Chưa chạy smoke test với PostgreSQL dữ liệu QA hoặc trình duyệt đăng nhập vì sandbox chưa có cấu hình DATABASE_URL/tài khoản nghiệp vụ.
- Chưa commit/push branch hoặc tạo PR; cần người dùng xác nhận nếu muốn thao tác GitHub remote.
- Cần rà soát mắt thường bản in trên môi trường browser thật, đặc biệt font Times New Roman và xuống dòng lý do dài.

## Next 3 actions

1. Chạy full Vitest sau test bổ sung, TSC và build lần cuối.
2. Kiểm tra diff, lint/format nếu phù hợp, kiểm tra số tiền bằng chữ và route print.
3. Commit branch và báo cáo thay đổi; chỉ push/PR khi người dùng yêu cầu hoặc đã được xác nhận.

## Files to read first

- `.task-memory/expense-payment-integration/02_state.md`
- `.task-memory/expense-payment-integration/03_decisions.md`
- `web/src/app/(app)/thu-chi/actions.ts`
- `web/src/lib/payment-request.ts`
- `web/src/app/(app)/ke-toan/de-nghi-thanh-toan/[id]/page.tsx`

## Quality risks

- Đây là thay đổi quy tắc dòng tiền: dữ liệu cũ và request tạo thủ công vẫn cần giữ luồng cũ.
- Phiếu bị từ chối vẫn gắn với dòng chi hiện có; người dùng cần xử lý lại từ Thu chi để resubmit, không tự động xóa dữ liệu.
- Route in phụ thuộc quyền `mod:ke-toan`; người nhập không có quyền Kế toán sẽ thấy mã liên kết nhưng không mở được phiếu nếu họ không được cấp quyền module.

## Release r12 — Hồ sơ dịch vụ thẩm mỹ và bản in sạch hơn — 2026-08-21

Đã xác minh nguyên nhân bản vá chưa cập nhật trước đó: PR #34 còn ở trạng thái OPEN/CI pending, nên `origin/master` vẫn dừng tại `fd5997e`; không phải lỗi migration hay lỗi code. Sau khi CI push và pull request đều pass, PR #34 đã merge lúc `2026-08-21T09:30:19Z`, merge commit `d552e2b`; tiếp đó PR #35 cập nhật VERSION/CHANGELOG r12 và đã merge vào master, merge commit hiện tại `31df247`.

Nội dung đã có trên master: bỏ dotted filler khỏi Giấy đề nghị thanh toán; đổi nhãn Phiếu tư vấn dịch vụ thẩm mỹ thành Hồ sơ dịch vụ thẩm mỹ trên preview/in/Word/editor/CTA; gộp bản hồ sơ tự sinh, Phiếu đồng ý và tài liệu bổ sung vào một khu vực duy nhất trong tab Giấy tờ; thêm nút + để mở hồ sơ, ghi nhận Phiếu đồng ý hoặc tải tài liệu; giữ nguyên URL consultation và dữ liệu lịch sử; không có migration mới.

Kiểm tra đã đạt: Prisma generate, TypeScript, ESLint tệp thay đổi, Vitest 53 file/334 test, Next production build; CI PR #34 và #35 đều xanh. Release tài liệu là `2026.08.21-r12`, ngày 21/08/2026, master `31df247` sau docs merge. Chưa smoke test trên máy Windows production/local của anh Lam.

Việc tiếp theo: anh Lam chạy `windows\\Sua-Loi.bat` bằng Run as administrator để script pull `origin/master` hiện tại, rebuild/restart Docker; sau đó test tab Giấy tờ, nút +, upload tài liệu, xem/in Hồ sơ dịch vụ thẩm mỹ và mẫu Giấy đề nghị thanh toán. Không chạy `prisma db push`; dữ liệu lịch sử được giữ nguyên.
