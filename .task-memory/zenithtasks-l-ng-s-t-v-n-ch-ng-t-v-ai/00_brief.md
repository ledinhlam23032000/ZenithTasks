# Brief dự án

## Mục tiêu
Nâng cấp ZenithTasks cho Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc để quản lý lương theo tiền khách thực thu, sổ tư vấn điện tử, chứng từ thanh toán in được, hồ sơ thỏa thuận nhân sự và trợ lý AI có thể đọc file, tiếp nhận góp ý, hỗ trợ giọng nói và thao tác có kiểm duyệt.

## Người dùng và nguyên tắc
Người dùng chính là BS. Lê Đình Lam, cần giao diện và hướng dẫn bằng tiếng Việt, dễ hiểu. Giao diện không dùng thương hiệu Zenith. Dữ liệu tiền, lương, hồ sơ y tế, khách hàng, thỏa thuận nhân sự và sửa code phải có phân quyền/audit phù hợp. Không commit API key, mật khẩu, `.env` thật hoặc dữ liệu khách thật.

## Quy tắc nghiệp vụ đã chốt

| Nhóm | Quy tắc chuẩn |
|---|---|
| Tư vấn viên | Mốc doanh số cộng dồn trong tháng, tách khách mới/cũ; áp dụng % bậc đạt được cho toàn bộ doanh số nhóm đó. |
| Căn cứ hoa hồng | Tiền khách thực tế đã thanh toán từng lần. Trả 5 triệu/tháng thì tháng đó chỉ tính trên 5 triệu. |
| Sổ tư vấn | Có thông tin hành chính, sàng lọc sức khỏe, dấu hiệu sinh tồn, mong muốn, hiện trạng, kết quả dự kiến, chỉ định BS, đăng ký dịch vụ và cam kết. Có nút xác nhận nhanh khi khách khỏe mạnh; cho bổ sung sau. |
| Chỉnh sửa y tế | Cho sửa trong 24 giờ kể từ lần lưu; sau 24 giờ chỉ ADMIN, mọi sửa sau hạn phải audit. |
| AI | Đọc/tải file, tạo bản nháp, nhận góp ý sửa sai, hỗ trợ giọng nói; không tự ghi đè dữ liệu gốc, không tự sửa code production, thao tác tiền/lương/y tế phải preview + ADMIN xác nhận. |
| Nhân sự | Có thỏa thuận bảo mật và không cạnh tranh/không lôi kéo, lưu phiên bản, trạng thái ký, thời hạn và snapshot. Nội dung pháp lý phải được chuyên gia rà soát trước khi dùng chính thức. |

## Tiêu chí hoàn thành

1. Migration additive chạy được trên database hiện tại, không reset dữ liệu.
2. Lương hiển thị hoa hồng tự động theo Payment và phần điều chỉnh thủ công riêng, không cộng đôi.
3. Sổ tư vấn lưu structured data, tự điền từ Customer/Case, khóa chỉnh sửa theo 24 giờ.
4. PaymentRequest tạo/in/duyệt/đánh dấu đã chi được; chi lương/CTV có chứng từ liên kết.
5. Hồ sơ nhân sự có agreement records và file/snapshot.
6. AI có file context, feedback records, voice input fallback và approval flow.
7. TypeScript, test, build, migration status và cập nhật máy vận hành đều được kiểm tra.

## Phụ lục bắt buộc — AI ADMIN và trung tâm chứng từ (18/08/2026)

Theo yêu cầu bổ sung của anh Lam, nhiệm vụ nâng cấp **Trợ lý AI quản trị dành cho ADMIN** là một phần bắt buộc của đợt nâng cấp, không được bỏ quên hoặc tự động đóng khi xử lý các phần tài chính khác. Trợ lý phải được cung cấp kiến thức vận hành đầy đủ của hệ thống: quy tắc thu tiền thực tế, công nợ, hoa hồng/lương, phân bổ phối hợp, thu–chi, kế toán, giấy đề nghị thanh toán, bảng lương, sổ tư vấn, nhân sự, hộp thư và phân quyền. AI phải trả lời có căn cứ từ quy tắc hệ thống và dữ liệu hiện tại, không chỉ trả lời chung chung.

AI ADMIN được phép tra cứu dữ liệu nghiệp vụ cần thiết theo quyền ADMIN, nhưng không được tự ý sửa code production, xóa dữ liệu, hoặc ghi nhận tiền/lương/hồ sơ khi chưa có bản xem trước, audit và xác nhận rõ ràng. Việc được đọc dữ liệu không đồng nghĩa với việc đưa secret, mật khẩu, API key hoặc toàn bộ dữ liệu nhạy cảm không cần thiết vào prompt/memory.

Song song với AI, luồng **Đề nghị thanh toán → duyệt ADMIN → ghi Sổ thu–chi một lần** là yêu cầu bắt buộc. Các khoản chi nhỏ như gói tăm 3.000đ cũng phải lập được chứng từ, in được và sau khi duyệt thì sinh đúng một dòng chi liên kết. Khu vực Kế toán phải có khả năng xem nhanh các nhóm chứng từ gồm giấy đề nghị thanh toán, bảng lương, phiếu thu/chi và các file xuất kế toán theo tháng/trạng thái.

### Tiêu chí không được đánh dấu hoàn tất

Chỉ được đánh dấu hoàn tất khi đã ghi nhận yêu cầu trên vào checkpoint, có test cho AI ADMIN và luồng chứng từ không ghi trùng, có kiểm tra quyền/audit, và tài liệu bàn giao mô tả rõ hai nhánh công việc này.
