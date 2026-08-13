# Ma trận vai trò và dữ liệu

## Nguyên tắc

Quyền module và quyền dữ liệu là hai lớp khác nhau. Có quyền mở trang khách hàng không đồng nghĩa với quyền xem toàn bộ bệnh sử, ảnh hoặc tài chính.

## Ma trận mục tiêu

| Vai trò | Hành chính | Cảnh báo y tế | Bệnh sử đầy đủ | Ảnh điều trị | Sửa lâm sàng | Tài chính chi tiết | Báo cáo tổng hợp |
|---|---|---|---|---|---|---|---|
| ADMIN | Đầy đủ | Có | Có | Có | Có | Có | Có |
| MANAGER | Có | Có | Có theo chính sách | Có theo chính sách | Không mặc định | Có | Có |
| DOCTOR | Có | Có | Có | Có | Có | Theo capability | Có giới hạn |
| NURSE | Có | Có | Phần cần cho chăm sóc | Phần cần cho chăm sóc | Theo workflow | Không mặc định | Không mặc định |
| CONSULTANT | Có | Cảnh báo tối thiểu | Không | Không | Không | Giá/dịch vụ cần tư vấn | Không mặc định |
| RECEPTION | Có | Cảnh báo tối thiểu | Không | Không | Không | Thu tiền theo quyền | Không mặc định |
| TELESALE | Lead/liên hệ | Không | Không | Không | Không | Không | Không |
| CARE | Liên hệ/chăm sóc | Phần cần chăm sóc | Không | Không mặc định | Không | Không mặc định | Không mặc định |
| SHAREHOLDER | Không định danh | Không | Không | Không | Không | Chỉ số tổng hợp | Có |

## Capability mục tiêu

- `clinical.alert.read`: xem cảnh báo tối thiểu.
- `clinical.full.read`: xem bệnh sử và thông tin lâm sàng đầy đủ.
- `clinical.write`: sửa dữ liệu lâm sàng.
- `clinical.photos.read`: xem ảnh điều trị.
- `clinical.photos.write`: thêm/xóa ảnh theo hồ sơ.
- `financial.detail.read`: xem payment/debt chi tiết.
- `reports.aggregate.read`: xem số liệu tổng hợp không định danh.
- `portal.manage`: tạo/thu hồi link cổng khách hàng.

## Quy tắc bắt buộc

- Dữ liệu nhạy cảm phải được lọc ở server trước khi render.
- `customerId` của ảnh phải được suy ra từ `caseId`.
- Mọi mutation child phải kiểm tra quan hệ child → case → customer trong cùng truy vấn authorize.
- Mọi thay đổi bệnh sử, chống chỉ định, ảnh, payment và tồn kho phải có audit log.

