# Quyết định dự án

| Ngày | ID | Quyết định | Lý do và tác động |
|---|---|---|---|
| 2026-08-18 | D-001 | Hoa hồng lấy theo các bản ghi `Payment` trong tháng dựa trên `paidAt`. | Khách trả nợ tháng nào thì tháng đó mới phát sinh căn cứ hoa hồng; không lấy toàn bộ giá chốt hoặc công nợ. |
| 2026-08-18 | D-002 | Tách `commissionOverride` khỏi hoa hồng tự động. | Tổng hoa hồng = công thức thực thu + phần điều chỉnh thủ công; tránh nhập lại số tự động và bị cộng đôi. |
| 2026-08-18 | D-003 | `CaseRevenueAllocation` là nguồn ưu tiên khi hồ sơ có phối hợp. | Chia thực thu theo `shareBps` cho đúng người/vai trò; doanh thu trung tâm vẫn đếm mỗi Payment một lần. |
| 2026-08-18 | D-004 | Sổ tư vấn có cửa sổ chỉnh sửa 24 giờ. | Người có quyền lâm sàng được sửa trong 24 giờ; sau hạn chỉ ADMIN và phải ghi audit. |
| 2026-08-18 | D-005 | AI chỉ đọc, đề xuất, tạo bản nháp và chờ approval. | Không để AI tự ghi đè tiền/lương/y tế hoặc sửa code production. |
| 2026-08-18 | D-006 | Thỏa thuận HR lưu snapshot theo type/version/status/thời hạn. | Có lịch sử và bằng chứng bản đã ký; nội dung pháp lý cần luật sư/lao động rà soát trước khi dùng chính thức. |
| 2026-08-18 | D-007 | Migration chỉ additive, không reset và không `db push` production. | Bảo vệ dữ liệu thật; luôn backup và kiểm tra Prisma trước khi áp dụng. |
| 2026-08-18 | D-008 | Trợ lý AI mặc định là trợ lý quản trị nội bộ dành cho ADMIN và phải nắm đầy đủ cơ chế vận hành. | AI được tra cứu dữ liệu nghiệp vụ cần thiết theo quyền ADMIN để trả lời có căn cứ; secret/API key/mật khẩu không đưa vào prompt hoặc memory. Preview, audit và xác nhận vẫn bắt buộc cho thao tác ghi. |
| 2026-08-18 | D-009 | Đề nghị thanh toán là chứng từ đầu vào cho mọi khoản chi, kể cả khoản rất nhỏ như gói tăm 3.000đ. | Sau khi ADMIN duyệt và thanh toán, hệ thống phải sinh hoặc liên kết đúng một CashTransaction EXPENSE; không tạo hai dòng chi cho cùng một phiếu. |
| 2026-08-18 | D-010 | Kế toán là trung tâm tra cứu chứng từ. | Có thể xem, lọc, mở và in Đề nghị thanh toán, bảng lương, phiếu thu/chi và các file xuất theo tháng/trạng thái. |
