# Xử lý sự cố nhanh

- **Không đăng nhập:** kiểm tra app, `AUTH_SECRET`, trạng thái user, TOTP và log rate-limit.
- **Không xem được ảnh:** kiểm tra bản ghi Photo, quan hệ case/customer, token portal và volume uploads; không cấp quyền bằng cách mở `/uploads`.
- **Không thêm dịch vụ:** kiểm tra hồ sơ đã khóa chưa, quyền `case.clinical`, định mức và tồn kho.
- **Thanh toán trùng:** kiểm tra `clientNonce`/`idempotencyKey`, không xóa record; dùng void có audit.
- **Migration fail:** dừng rollout, giữ app cũ, kiểm tra backup và schema history.
- **Backup fail:** không coi backup là thành công; kiểm tra Docker, volume, disk và offsite copy.
