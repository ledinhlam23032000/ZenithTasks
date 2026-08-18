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

Sau kiểm tra thực tế, đã sửa action `none`: AI có bước tạo câu trả lời cuối dựa trên knowledge và có fallback cho câu hỏi hoa hồng thực thu/Đề nghị thanh toán, nên không còn chỉ nói “đã hiểu yêu cầu”. Đã kiểm tra bằng câu hỏi dịch vụ 100 triệu trả 5 triệu/tháng và khoản tăm 3.000đ; AI trả lời đúng cơ chế, không ghi dữ liệu.

Theo xác nhận ADMIN, tài khoản vận hành được gỡ cờ `mustChangePassword` mà không đổi `passwordHash`; phiên cũ đã logout/login lại. Máy Windows đã build/recreate image r3 sau backup `F:\\6.Sao lưu hệ thống\\zenith-2026-08-18_0857.zip`; database healthy và migration up to date.

## Kiểm tra đã đạt

- `git diff --check`: đạt.
- `npx prisma validate`: đạt.
- `npx prisma generate`: đạt.
- `./node_modules/.bin/tsc --noEmit`: đạt.
- `./node_modules/.bin/vitest run`: 45 file, 299 test đạt.
- `./node_modules/.bin/next build`: đạt; các route mới đã được build.
- Kiểm tra browser ADMIN: `/ke-toan`, `/thu-chi`, `/tro-ly` mở được; AI trả lời đúng câu hỏi hoa hồng thực thu và quy trình chi 3.000đ, không tạo dữ liệu thật.
- Test mới: metadata khoản chi nhỏ, khóa sửa/xóa CashTransaction đã liên kết và knowledge map AI ADMIN đều đạt.

## Trạng thái sau cập nhật máy phòng khám

Đã backup, build/recreate image, kiểm tra migration và kiểm tra đọc-only bằng phiên ADMIN. Chưa tạo phiếu chi thử/duyệt PAID thật để không phát sinh dữ liệu kế toán ngoài ý muốn; khi anh muốn đưa khoản chi thực tế vào sổ, hãy dùng luồng Đề nghị thanh toán mới.

Các kiểm tra nghiệp vụ còn có thể làm lúc thuận tiện gồm tải file/voice AI, xuất file kế toán, kiểm tra QR, hộp thư và backup status. Đây là kiểm tra bổ sung, không phải điều kiện để app khởi động.

## Nguyên tắc an toàn

Không commit API key, mật khẩu, `.env` thật hoặc dữ liệu khách hàng thật. Không dùng `prisma db push` trên máy vận hành. Không reset database. Các khoản tiền, lương, chứng từ, dữ liệu y tế và sửa sau hạn phải có quyền/audit phù hợp.


### Bổ sung phiên bản 2026.08.18-r4 — AI Admin Gateway

Release `efce179` mở rộng Trợ lý AI theo hướng trợ lý thực thi nội bộ dưới quyền ADMIN. Không loại bỏ nghiệp vụ tuyệt đối; thay vào đó, server tool tự kiểm tra quyền, thao tác ghi hiển thị preview và approval, còn xóa, tiền/lương, hồ sơ y tế, quyền tài khoản và thay đổi code cần mức kiểm soát cao hơn.

Đã thêm migration `20260818120000_ai_admin_gateway` với `AssistantConversation`, `AssistantMessage` và trường liên kết `conversationId` cho `AssistantApproval`. Lịch sử lưu câu hỏi, câu trả lời, preview, approval, kết quả, hủy và metadata; giao diện `/tro-ly` có sidebar phiên gần đây, tiêu đề theo câu hỏi đầu tiên và nút tạo phiên mới.

Đã thêm `bulkUpsertAttendance` và parser `attendance-intent.ts`. Với yêu cầu nêu rõ nhân sự, khoảng ngày, giờ vào/ra và xác nhận đủ ngày, AI tạo preview một lần; sau khi ADMIN xác nhận, action upsert Attendance trong transaction, audit từng ngày và revalidate Chấm công/Lương/Kế toán. Ngày đã có bản ghi sẽ được cập nhật theo preview, không tạo bản ghi trùng.

Bằng chứng kiểm tra release: Prisma validate/generate đạt; TypeScript đạt; 46 file và 302/302 test đạt; Next.js production build đạt. Migration r4 **chưa chạy trên máy phòng khám** tại thời điểm bàn giao phụ lục này. Trước khi triển khai phải backup, đồng bộ repo, build image mới, chạy `docker compose exec -T app npx prisma migrate deploy`, kiểm tra `prisma migrate status`, rồi thử lệnh chấm công trong phiên ADMIN và tải lại `/tro-ly` để kiểm tra lịch sử.

Phần workflow thay đổi code vẫn đang được mở rộng: khi anh yêu cầu đổi cơ chế/code, AI phải tạo kế hoạch/diff/test/backup/triển khai có kiểm soát; không sửa mù trực tiếp trong production container.


### Bổ sung phiên bản 2026.08.18-r6 — Registry AI nghiệp vụ

Commit code chuẩn r6 là `0f81781`; tài liệu phát hành hiện tại ở `b76f7a1`. CI của cả hai commit đều success. Registry AI đã có tool đọc hồ sơ khách theo mã với số điện thoại chỉ hiện 5 số cuối, sửa hồ sơ có kiểm tra trùng/mã hóa số, xóa hồ sơ sau preview với hoàn kho trong transaction, cập nhật Sổ tư vấn theo rule 24 giờ, lập Đề nghị thanh toán PENDING và quản lý các bước duyệt/từ chối/ghi sổ PAID.

Mọi tool mới đều kiểm tra quyền ở server-side, đối chiếu dữ liệu thật trước khi tạo AssistantApproval, lưu preview và audit. Xóa khách là vĩnh viễn; PaymentRequest chỉ sinh CashTransaction ở bước PAID. Workflow `propose_system_change` hiện tạo PlanTask cha và checklist 5 bước: phân tích, diff để ADMIN xem, test, backup/migration và triển khai/kiểm tra.

Kiểm tra r6 đạt: Prisma validate/generate, TypeScript, Vitest 46 file/303 test, Next production build và CI. Máy Windows đã chạy HEAD code `0f81781` bằng image `sha256:fd6bc2244f22046d2060747282082e675a0bc18af03e8e90171434b7beebed8a`; database healthy, 49 migrations up to date, không có migration mới ở r6 và `/login` HTTP 200. Approval preview chấm công thử nghiệm đã hết hạn được chuyển sang EXPIRED; không có Attendance thật phát sinh từ preview chưa xác nhận. Biên bản chi tiết ở `checks/2026-08-18-r6-ai-registry-production.md`.

Chưa thực hiện thao tác ghi hồ sơ/chứng từ thật bằng các tool r6 trên production. Khi kiểm thử nghiệp vụ thật, phải dùng bản ghi test đã xác định, xem preview và chỉ bấm xác nhận sau khi ADMIN kiểm tra.
