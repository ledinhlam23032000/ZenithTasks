# Changelog ZenithTasks

Tài liệu này ghi các thay đổi đã được đẩy lên nhánh `master`. Commit mới hơn nằm ở phía trên. Phiên bản mô tả đầy đủ hiện tại nằm trong [`VERSION.md`](VERSION.md).

## 2026-08-18 — `2026.08.18-r4`

Commit chuẩn: [`efce179`](https://github.com/ledinhlam23032000/ZenithTasks/commit/efce179).

### AI Admin Gateway có giám sát

- Mở rộng Agent theo hướng trợ lý thực thi nội bộ: không dùng `propose_system_change` để thay cho nghiệp vụ đã có tool; registry tool được mở rộng tiếp theo từng module.
- Thêm knowledge map cho Chấm công và AI Admin Gateway, ghép lịch sử hội thoại để không hỏi lại thông tin đã có trong các lượt trước.
- Thêm `bulk_upsert_attendance`: chấm công nhiều ngày cho một nhân sự, upsert theo khóa nhân sự/ngày, transaction, audit và cập nhật lại các trang Chấm công/Lương/Kế toán.
- Với lệnh rõ như “từ 2/8 đến 18/8, sáng 8h, chiều 17h, chưa nghỉ ngày nào”, AI tạo preview một lần; ADMIN bấm xác nhận để thực hiện, không tạo bản ghi chấm công trùng.

### Lưu trữ phiên trò chuyện

- Thêm `AssistantConversation` và `AssistantMessage`, liên kết `AssistantApproval` với phiên.
- Lưu câu hỏi, câu trả lời, preview, approval, kết quả thực thi, hủy và metadata; đổi trang hoặc tải lại vẫn khôi phục được lịch sử.
- Thêm sidebar các phiên gần đây, tiêu đề tự sinh từ câu hỏi đầu tiên và nút “Cuộc trò chuyện mới” để archive phiên cũ.

### Kiểm tra

- Prisma validate/generate đạt.
- TypeScript đạt.
- Vitest: **46 file, 302/302 test đạt**; riêng parser chấm công đạt 3/3.
- Next.js production build đạt.
- Migration `20260818120000_ai_admin_gateway` đã tạo nhưng **chưa áp dụng trên máy phòng khám**; cần backup trước khi deploy.

## 2026-08-18 — `2026.08.18-r3`

Commit chuẩn: [`989c850`](https://github.com/ledinhlam23032000/ZenithTasks/commit/989c850).

### Sửa Trợ lý AI sau kiểm tra thực tế

- Sửa lỗi action `none` trước đây chỉ trả lời kiểu “đã hiểu yêu cầu” mà chưa giải thích nội dung.
- AI nay có bước tạo câu trả lời cuối dựa trên `BUSINESS_RULES_KNOWLEDGE` và số liệu hiện tại; nếu câu hỏi thuộc nhóm hoa hồng thực thu hoặc Đề nghị thanh toán khoản nhỏ, có fallback nghiệp vụ để không trả lời rỗng/chung chung.
- Đã kiểm tra bằng phiên ADMIN: AI giải thích đúng ví dụ dịch vụ 100.000.000đ trả 5.000.000đ/tháng chỉ tính hoa hồng trên 5.000.000đ thực thu; khoản tăm 3.000đ đi qua PENDING → ADMIN duyệt → PAID tạo đúng một CashTransaction EXPENSE liên kết.

### Triển khai vận hành

- Đã backup `F:\\6.Sao lưu hệ thống\\zenith-2026-08-18_0857.zip`.
- Đã build/recreate image Docker mới trên máy Windows; database healthy, Prisma báo không còn migration pending và `/login` HTTP 200.
- Đã gỡ cờ bắt buộc đổi mật khẩu theo xác nhận trực tiếp của ADMIN, giữ nguyên passwordHash; đã logout/login lại để tạo JWT mới.

## 2026-08-18 — `2026.08.18-r2`

Commit chuẩn: [`4ba1310`](https://github.com/ledinhlam23032000/ZenithTasks/commit/4ba1310).

### Chứng từ, Thu–chi và Kế toán

- Từ Sổ thu–chi, ADMIN có thể chọn **Lập giấy đề nghị thanh toán trước**, dùng được cho khoản rất nhỏ như gói tăm 3.000đ. Phiếu được tạo PENDING và chưa ghi dòng chi cho đến khi được duyệt và thanh toán.
- Khi ghi PAID, PaymentRequest tạo đúng một CashTransaction EXPENSE có `paymentRequestId`; Sổ thu–chi hiển thị số phiếu/trạng thái và liên kết ngược tới bản in. Dòng đã liên kết bị khóa sửa/xóa trực tiếp để tránh lệch sổ.
- Khu vực Kế toán có **Trung tâm chứng từ** để mở/in Đề nghị thanh toán, bảng lương, Sổ thu–chi và các file xuất theo tháng; số lương dùng cùng read-model với bảng lương chính.

### Trợ lý AI ADMIN

- Planner AI được cấp mặc định kho kiến thức bản đồ vận hành của hệ thống, gồm hồ sơ, hộp thư, lương/hoa hồng, Thu–chi, Kế toán, Đề nghị thanh toán, Kho, Nhân sự, Phân quyền và Nhật ký.
- AI được hướng dẫn phân biệt PaymentRequest với CashTransaction, biết khoản chi nhỏ cũng phải có thể lập chứng từ và phải dùng read tool khi hỏi số liệu cụ thể; thao tác ghi vẫn bắt buộc preview, audit và ADMIN xác nhận.
- Bộ nhớ dài hạn của nhiệm vụ đã ghi rõ AI ADMIN là workstream bắt buộc, không được bỏ quên khi hoàn tất phần tài chính.

### Kiểm tra

- Prisma validate/generate đạt.
- TypeScript đạt.
- Vitest: **45 file, 299/299 test đạt**.
- Next.js production build đạt.
- Commit này chưa được áp dụng lên máy vận hành; cần backup và build/recreate Docker trước khi chạy migration nếu migration pending.

## 2026-08-18 — `2026.08.18-r1`

Commit chuẩn nội dung: [`87c131c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/87c131c).

### Tài chính, lương và chứng từ

- Chuyển hoa hồng tự động sang căn cứ tiền khách thực tế đã thanh toán theo từng Payment; khách trả góp đến đâu tính đến đó.
- Tách `commissionOverride` khỏi hoa hồng tự động để không cộng đôi khi kế toán điều chỉnh thủ công.
- Thêm giấy đề nghị thanh toán tại `/ke-toan/de-nghi-thanh-toan`: tạo phiếu, ADMIN duyệt/từ chối, ghi sổ PAID, in Word/HTML và liên kết CashTransaction.
- Luồng chi lương và hoa hồng cộng tác viên tự tạo chứng từ PAID liên kết với phiếu lương/CTV; hoàn tác sẽ hủy liên kết phù hợp.

### Sổ tư vấn và hồ sơ nhân sự

- Thêm sổ tư vấn điện tử gồm hành chính bổ sung, sinh hiệu, 18 câu sàng lọc, nút đánh dấu nhanh, mong muốn, hiện trạng, kết quả dự tính, chỉ định và xác nhận khách.
- Thêm giới hạn sửa sổ tư vấn trong 24 giờ; sửa sau hạn chỉ ADMIN và bắt buộc audit; có route in sổ tư vấn.
- Thêm hồ sơ thỏa thuận bảo mật và không cạnh tranh/không lôi kéo với version, snapshot nội dung, trạng thái nháp/đã ký/thu hồi, thời hạn và route in.

### AI quản trị

- Cho phép upload và trích xuất nội dung TXT, CSV, JSON, Word, Excel, PDF; file tối đa 15MB và tự hết hạn sau 30 ngày.
- Thêm feedback đúng/cần sửa để lưu thành bộ nhớ phản hồi theo tài khoản; thêm nhập câu hỏi bằng giọng nói trên trình duyệt.
- Giữ nguyên whitelist tool, preview và ADMIN approval; AI không tự sửa code production, tiền, lương hoặc hồ sơ y tế.

### Kiểm tra và triển khai production

- 45 file test, 296/296 test đạt.
- Prisma validate, TypeScript và Next.js production build đạt.
- Đã lưu checkpoint bộ nhớ nhiệm vụ dài trong `.task-memory/` và biên bản tại `UPGRADE-HANDOFF-2026-08.md`.
- Đã tạo backup production tại `F:\\6.Sao lưu hệ thống\\zenith-2026-08-18_0134.zip` trước khi cập nhật.
- Đã recreate `zenithtasks-app-1` bằng image mới; database vẫn healthy, migration `20260818100000_finance_consultation_hr_ai` đã áp dụng và `prisma migrate status` báo schema up to date.
- Endpoint `http://localhost:3000/login` trả HTTP 200 sau cập nhật.
- Sửa `web/Dockerfile` và quy trình CI để dùng `pnpm install --frozen-lockfile`, tương thích với `pnpm-lock.yaml` và các thư viện đọc file mới; vì vậy `Sua-Loi.bat` build image thành công thay vì dừng ở bước cài dependency.

## 2026-08-17 — `2026.08.17-r2`

### Tài chính, lương và doanh thu

- Sửa lỗi doanh thu bị đếm đôi khi một nhân sự vừa là tư vấn viên vừa là bác sĩ của cùng hồ sơ.
- Thêm engine phân bổ doanh thu theo hồ sơ tại `web/src/lib/revenue-attribution.ts`.
- Thêm tab `Phối hợp DS` để ADMIN chia doanh thu giữa nhiều nhân sự theo tỷ lệ; tổng tỷ lệ phải đủ 100%.
- Đồng bộ DS phân bổ giữa bảng lương và hiệu suất nhân sự.
- Thêm cảnh báo tài chính cho snapshot lệch, trả vượt, thanh toán không có dịch vụ, giảm giá/voucher bất thường và thanh toán không hợp lệ.
- QR VietQR cho phép nhân viên nhập số tiền bất kỳ trước khi tạo mã.

### AI quản trị

- Thêm tool AI đọc công nợ, bảng lương, xuất file và tổng quan vận hành.
- Thêm xếp hạng khách nên ưu tiên gọi lại.
- Thêm đọc cảnh báo tài chính.
- Thêm luồng tạo follow-up, ghi nhận thanh toán và tạo lịch hẹn.
- Mọi thao tác ghi có bản xem trước, kiểm quyền và xác nhận ADMIN.
- Thêm fallback JSON khi provider AI không hỗ trợ `response_format` dạng JSON Schema.

### Hộp thư và vận hành

- Thêm phân công hội thoại cho nhân viên.
- Thêm trạng thái `OPEN`, `IN_PROGRESS`, `DONE`.
- Tin đến tự mở lại hội thoại và tính SLA theo Facebook/Zalo.
- Thêm mẫu trả lời nhanh trong hộp thư.
- Thêm Timeline khách hàng 360° gồm hồ sơ, lịch hẹn, follow-up, chăm sóc và hội thoại.
- Dashboard có tin chưa đọc và cảnh báo tài chính.

### Kiểm tra

- 44 file test, 296/296 test đạt.
- TypeScript đạt.
- Next.js production build đạt.
- Git working tree sạch tại thời điểm cập nhật.

### Commit liên quan

| Commit | Nội dung |
|---|---|
| [`e9071af`](https://github.com/ledinhlam23032000/ZenithTasks/commit/e9071af) | Revenue attribution core |
| [`d79816c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/d79816c) | QR nhập số tiền |
| [`4162672`](https://github.com/ledinhlam23032000/ZenithTasks/commit/4162672) | Dashboard tin chưa đọc |
| [`30861c6`](https://github.com/ledinhlam23032000/ZenithTasks/commit/30861c6) | Phân công và SLA hộp thư |
| [`827f5ee`](https://github.com/ledinhlam23032000/ZenithTasks/commit/827f5ee) | Cảnh báo tài chính |
| [`f5bad30`](https://github.com/ledinhlam23032000/ZenithTasks/commit/f5bad30) | AI ưu tiên khách và cảnh báo |
| [`585e5c6`](https://github.com/ledinhlam23032000/ZenithTasks/commit/585e5c6) | AI tạo lịch hẹn |
| [`87fb972`](https://github.com/ledinhlam23032000/ZenithTasks/commit/87fb972) | Timeline khách hàng 360° |
| [`5c67b0c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/5c67b0c) | Mẫu trả lời nhanh |
| [`e993fc5`](https://github.com/ledinhlam23032000/ZenithTasks/commit/e993fc5) | Công bố VERSION, CHANGELOG và cập nhật tài liệu bàn giao |

## Quy tắc ghi changelog cho các phiên sau

Mỗi thay đổi nghiệp vụ phải ghi ngày, mục đích, tệp hoặc migration chính, ảnh hưởng dữ liệu, test đã chạy và việc chủ dự án cần làm. Không ghi “đã xong” nếu mới chỉ sửa giao diện mà chưa kiểm tra luồng server, quyền và dữ liệu.
