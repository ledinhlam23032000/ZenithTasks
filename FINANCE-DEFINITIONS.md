# ZenithTasks — Từ điển dữ liệu tài chính và baseline

## Nguồn sự thật

- **Doanh thu hồ sơ / doanh thu phòng khám:** tổng `summarizeCase(...).total` từ các dòng dịch vụ và voucher. Mỗi hồ sơ chỉ tính một lần ở cấp phòng khám.
- **Thực thu:** tổng các Payment hợp lệ theo `paidAt`; `collectionsTotal()` đã đếm mỗi khoản một lần ở cấp phòng khám.
- **Công nợ:** `max(total - paid, 0)` từ child records; không dùng snapshot nếu lệch.
- **DS chốt hiện tại:** `getStaffPerformance()` đang cộng `consultRevenue` theo `consultantId` và `doctorRevenue` theo `doctorId`; nếu một người trùng cả hai vai trò, cùng doanh thu hồ sơ xuất hiện hai lần trong `totalRevenue`.
- **Thực thu theo nhân sự hiện tại:** `collectionsByStaff()` cố ý trả cùng một khoản vào hai góc nhìn consultants/doctors. Đây có thể giữ cho báo cáo vai trò, nhưng không được dùng để tạo tổng doanh thu phòng khám.
- **Hoa hồng:** quản lý nhập tay trong PayrollEntry; hệ thống chỉ hiển thị gợi ý, không tự ghi đè.

## Lỗi đã xác nhận

1. Người kiêm consultant và doctor của hồ sơ 48.000.000 đồng có thể hiện `consultRevenue=48.000.000`, `doctorRevenue=48.000.000`, `totalRevenue=96.000.000` trong hiệu suất/bảng lương. Đây là sai nếu chỉ tiêu là tổng doanh thu thực tế của nhân sự.
2. Case editor hiện chỉ có một `consultantId` và một `doctorId`; chưa có nhiều người phối hợp, tỷ lệ hoặc số tiền phân bổ.
3. Trang chi tiết hiệu suất tự cộng lại hai danh sách consultCases/doctorCases, nên chỉ sửa service backend chưa đủ; caller cũng phải chuyển sang nguồn phân bổ chung.
4. Global reports đã tính doanh thu phòng khám theo case một lần; không được làm thay đổi thành tổng role revenue.

## Quyết định bảo toàn số liệu

Trong giai đoạn sửa đầu tiên, không tự ý biến đổi dữ liệu cũ. Bổ sung lớp tính phân bổ và hiển thị song song `Doanh thu hồ sơ`, `Doanh số được phân bổ`, `Chưa phân bổ` để có thể đối soát. Nếu chưa có allocation record, quy tắc tương thích ngược sẽ gán 100% cho một vai trò duy nhất; trường hợp cùng người ở hai vai trò chỉ tính một lần, không cộng đôi.

Phân bổ phối hợp mới sẽ ưu tiên theo dòng dịch vụ; một case có thể có nhiều dòng và mỗi dòng có các assignment. Tổng tỷ lệ trên mỗi dòng phải là 100% ở chế độ bắt buộc 100%; tổng số tiền phân bổ phải khớp corrected final price của dòng sau làm tròn; phần dư do làm tròn được gán cho assignment cuối theo thứ tự ổn định.

## Bộ case kiểm thử bắt buộc

- Một case 48.000.000 đồng, cùng user là consultant và doctor: clinic revenue 48.000.000, staff DS không vượt 48.000.000.
- Một case 48.000.000 đồng, consultant A 60%, doctor B 40%: phân bổ A 28.800.000, B 19.200.000, tổng 48.000.000.
- Một case có ba người với tỷ lệ 33,33%/33,33%/33,34%: tổng phân bổ đúng tuyệt đối sau rounding.
- Nhiều dịch vụ trong cùng case: phân bổ độc lập theo từng dòng.
- Case đã khóa hoặc tháng đã chốt: không sửa allocation.
- Phân bổ thiếu/vượt 100%: validation chặn theo chế độ.
- Payment trùng hoặc payment không hợp lệ: không tăng doanh thu/hoa hồng.
