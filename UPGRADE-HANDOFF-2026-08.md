# Biên bản nâng cấp — Lương, sổ tư vấn, chứng từ, nhân sự và AI

## Quy tắc đã được anh Lê Đình Lam xác nhận

Anh xác nhận hoa hồng tư vấn viên dùng doanh số cộng dồn theo tháng, tách riêng khách mới và khách cũ, áp dụng mức phần trăm của bậc đạt được cho toàn bộ doanh số của nhóm đó. Tuy nhiên, căn cứ chi hoa hồng là **tiền khách thực tế đã thanh toán từng lần**: dịch vụ 100 triệu nhưng khách trả 5 triệu mỗi tháng thì từng tháng chỉ tính hoa hồng trên 5 triệu đã thu trong tháng đó.

Sổ tư vấn điện tử có thể tích chọn nhanh khi khách khỏe mạnh/không phát hiện vấn đề, sau đó bác sĩ vẫn được bổ sung hồ sơ nếu thấy cần. Hồ sơ tư vấn được chỉnh sửa trong 24 giờ kể từ lần lưu; quá 24 giờ chỉ ADMIN được sửa và mọi sửa sau hạn phải có audit.

Bản chuẩn bị in nếu sai có thể sửa thủ công hoặc yêu cầu AI tạo lại bản nháp. AI không tự ghi đè dữ liệu gốc, không tự sửa code production và không tự thực hiện thao tác tiền/lương/hồ sơ y tế. AI có thể đọc/tải file, trích xuất nội dung, nhận góp ý để tạo bộ nhớ phản hồi, hỗ trợ giọng nói và đề xuất thao tác; thay đổi vẫn phải qua preview + ADMIN xác nhận.

Nhân sự cần có hồ sơ thỏa thuận bảo mật thông tin khách hàng và không cạnh tranh/không lôi kéo, lưu phiên bản, trạng thái ký, thời hạn và bản snapshot. Các điều khoản pháp lý trong mẫu phải được luật sư/lao động rà soát trước khi ký chính thức.

## Tài liệu nguồn đã đọc

- `CơchếlươngnhânsựTrungTâm.docx`
- `SổtưvấndịchvụPTTM.docx`
- `ThỏaThuậnBảoMậtThôngTinKháchHàng.docx`
- `THỎATHUẬNKHÔNGCẠNHTRANH.docx`

## Đã triển khai trong mã nguồn ở phiên hiện tại

Đã mở rộng `web/prisma/schema.prisma` với `PaymentRequest`, `ConsultationRecord`, `StaffAgreement`, `AssistantFile`, `AssistantFeedback` và các enum liên quan. Đã thêm liên kết chứng từ dự kiến cho `PayrollEntry`, `CommissionPayout` và `CashTransaction`; `npx prisma validate` và `npx prisma generate` đã đạt.

Logic hoa hồng hiện lấy các Payment theo `paidAt`, phân bổ theo `CaseRevenueAllocation` khi có, chia theo dịch vụ/vai trò, tránh cộng đôi nhân sự kiêm nhiệm và tách `commissionOverride` khỏi hoa hồng tự động. Bảng lương, sửa nhanh cả bảng, agent AI và mẫu xuất được cập nhật để không nhập lại số tự động.

Đã có trang `/ke-toan/de-nghi-thanh-toan`: ADMIN lập chứng từ, chứng từ PENDING chờ duyệt, ADMIN duyệt/từ chối, sau đó ghi sổ PAID và CashTransaction liên kết. Chi lương/CTV tự tạo chứng từ PAID liên kết với PayrollEntry/CommissionPayout; hoàn tác sẽ hủy chứng từ.

Đã có sổ tư vấn điện tử trong hồ sơ điều trị, gồm hành chính bổ sung, sinh hiệu, 18 câu sàng lọc, nút đánh dấu nhanh, mong muốn, hiện trạng, kết quả dự tính, chỉ định và xác nhận khách. Có khóa chỉnh sửa 24 giờ, ADMIN sửa muộn có audit và route in `/ho-so/[id]/consultation-export`.

Đã có hồ sơ thỏa thuận tại `/nhan-su/[id]/thoa-thuan` với template bảo mật/không cạnh tranh, version, snapshot, bản nháp, đánh dấu đã ký, thời hạn, thu hồi và route in snapshot.

Trợ lý AI có khu vực tải file TXT/CSV/JSON/DOC/DOCX/XLS/XLSX/PDF/ảnh tối đa 15MB, trích xuất text bằng `mammoth`, `xlsx`, `pdf-parse`, lưu tối đa 30 ngày, đưa file context vào planner; có feedback đúng/cần sửa, audit và nhập giọng nói bằng Web Speech API với ô gõ dự phòng. Planner vẫn chỉ dùng whitelist và approval.

### Bổ sung phiên bản 2026.08.18-r2

Từ Sổ thu–chi, ADMIN có thể chọn lập Đề nghị thanh toán trước cho khoản chi nhỏ như gói tăm 3.000đ. Hệ thống tạo PaymentRequest PENDING, chưa tạo dòng CashTransaction. Sau khi ADMIN duyệt và ghi PAID, hệ thống tạo đúng một CashTransaction EXPENSE có liên kết `paymentRequestId`; Sổ thu–chi và trang Đề nghị thanh toán có link đối chiếu. Dòng thu–chi đã liên kết bị khóa sửa/xóa trực tiếp để không lệch chứng từ.

Trang Kế toán có component Trung tâm chứng từ tại `web/src/app/(app)/ke-toan/accounting-document-center.tsx`, cho phép mở nhanh Đề nghị thanh toán, bảng lương, Sổ thu–chi và các route xuất Excel/Word theo tháng.

Planner trong `web/src/app/(app)/tro-ly/agent.ts` hiện nạp `BUSINESS_RULES_KNOWLEDGE` gồm bản đồ module, quy tắc chứng từ và cách xử lý khoản chi nhỏ. Với ADMIN, planner được phép dùng kiến thức này cùng các read tool và snapshot số liệu; câu hỏi về số liệu cụ thể vẫn phải dùng tool hoặc nói rõ chưa có dữ liệu. Preview, audit và ADMIN approval cho thao tác ghi không thay đổi.

## Kiểm tra đã đạt

- `git diff --check`: đạt.
- `npx prisma validate`: đạt.
- `npx prisma generate`: đạt.
- `./node_modules/.bin/tsc --noEmit`: đạt.
- `./node_modules/.bin/vitest run`: 45 file, 299 test đạt.
- `./node_modules/.bin/next build`: đạt; các route mới đã được build.
- Test mới: metadata khoản chi nhỏ, khóa sửa/xóa CashTransaction đã liên kết và knowledge map AI ADMIN đều đạt.

## Còn phải làm trước khi cập nhật máy phòng khám

1. Backup máy phòng khám trước khi cập nhật; không reset database.
2. Build/recreate image Docker từ commit mới; nếu `prisma migrate status` báo pending thì chạy `prisma migrate deploy`.
3. Kiểm tra thực tế bằng tài khoản ADMIN: từ Sổ thu–chi chọn khoản chi nhỏ, mở Đề nghị thanh toán, duyệt, ghi PAID và xác nhận chỉ có một dòng Thu–chi; mở Trung tâm chứng từ; hỏi AI các câu về hoa hồng thực thu, chứng từ và module vận hành.
4. Sau đó kiểm tra lại đăng nhập, bảng lương, QR, hộp thư, AI file/voice và backup status.

## Nguyên tắc an toàn

Không commit API key, mật khẩu, `.env` thật hoặc dữ liệu khách hàng thật. Không dùng `prisma db push` trên máy vận hành. Không reset database. Các khoản tiền, lương, chứng từ, dữ liệu y tế và sửa sau hạn phải có quyền/audit phù hợp.
