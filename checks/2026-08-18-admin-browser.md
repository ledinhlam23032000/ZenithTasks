# Kiểm tra trình duyệt ADMIN — 2026-08-18

- Phiên My Browser đã đăng nhập bằng tài khoản `@bacsithammy123`, vai trò hiển thị là **Quản trị viên**, mã NV NV002.
- `http://localhost:3000/login` sau đăng nhập mở được dashboard/tài khoản.
- Khi điều hướng trực tiếp tới `/ke-toan`, trình duyệt chuyển về `/tai-khoan?force=1`; chưa kết luận nguyên nhân.
- Không thực hiện thao tác ghi tiền, tạo phiếu, duyệt phiếu hay thay đổi hồ sơ trong bước kiểm tra này.
- Container app mới đã chạy image `d6cb8b4...`, database healthy, Prisma báo schema up to date và `/login` HTTP 200.
- Nguyên nhân đã xác định: JWT và User đều có `mustChangePassword=true`, proxy chuyển mọi route nghiệp vụ về `/tai-khoan?force=1`.
- Theo xác nhận ADMIN, đã chạy cập nhật duy nhất `User.mustChangePassword=false`, không thay đổi `passwordHash`; app restart và migration vẫn up to date.
- Phiên JWT cũ đã được đăng xuất, sau đó đăng nhập lại bằng tài khoản hiện tại; dashboard mở bình thường và sidebar hiện Kế toán/Thu chi/Đề nghị thanh toán.
- Trang `/ke-toan` mở thành công bằng phiên ADMIN mới; hiển thị Trung tâm chứng từ, bảng lương tháng 08/2026 và các link Đề nghị thanh toán/Bảng lương/Sổ thu–chi.
- Trang `/thu-chi` mở thành công; có nút Đề nghị thanh toán, cột Chứng từ và nút Thêm thu/chi.
- Đã mở modal Ghi nhận thu/chi ở chế độ kiểm tra; chưa chọn hạng mục, chưa nhập tiền và chưa gửi form.
- Đã cuộn container modal và sau đó đóng modal; không chọn hạng mục, không nhập tiền, không gửi form và không tạo dòng Thu–chi mới.
- Đã mở `/tro-ly` bằng phiên ADMIN mới; giao diện có nút tải file, voice và các shortcut đọc lương/xuất bảng lương.
- Lần kiểm tra đầu cho thấy AI chỉ trả lời khung chung; đã sửa action=none và build/recreate image mới.
- Lần kiểm tra lại bằng đúng câu hỏi cho thấy AI giải thích cụ thể: hoa hồng chỉ tính trên từng Payment thực thu, ví dụ 5.000.000đ; không tính trên giá chốt 100.000.000đ; khoản tăm 3.000đ đi qua PENDING → ADMIN duyệt → PAID tạo đúng một CashTransaction EXPENSE liên kết, không ghi tay trùng. AI không ghi dữ liệu trong bài kiểm tra.
