# Production Operations Runbook

## Môi trường vận hành

Ứng dụng chạy trên máy Windows tại `C:\Users\PC\ZenithTasks` bằng Docker Desktop. Service app là `zenithtasks-app-1`, PostgreSQL là `zenithtasks-db-1`, database mặc định là `zenith_clinic`, user PostgreSQL mặc định là `zenith`. Người dùng truy cập qua trình duyệt/PWA; không thao tác trực tiếp vào database nếu chưa có lý do và backup rõ ràng.

## Trước khi cập nhật

Đọc `VERSION.md`, `CHANGELOG.md`, `web/AGENTS.md` và file kiểm chứng release gần nhất. Kiểm tra GitHub branch `master`, CI của commit định triển khai và trạng thái Git trên máy Windows. Nếu có migration hoặc thay đổi dữ liệu, tạo backup trước. Không commit `.env`, password, API key, database dump hoặc dữ liệu khách lên GitHub.

## Quy trình cập nhật chuẩn

```powershell
Set-Location 'C:\Users\PC\ZenithTasks'
git status --short
git pull --ff-only origin master

docker compose build app
docker compose up -d --force-recreate app
docker compose exec -T app npx prisma migrate status
docker compose ps
```

Nếu có migration mới, entrypoint phải chạy `prisma migrate deploy` hoặc chạy lệnh deploy được phê duyệt sau backup. Tuyệt đối không dùng `prisma db push`, `prisma migrate reset` hoặc xóa volume database trên production.

## Kiểm tra sau cập nhật

| Kiểm tra | Lệnh/cách làm | Tiêu chí đạt |
|---|---|---|
| Container | `docker compose ps` | app running, db healthy. |
| Image | `docker inspect zenithtasks-app-1 --format '{{.Image}}'` | Đúng image vừa build. |
| Migration | `docker compose exec -T app npx prisma migrate status` | Database schema is up to date. |
| HTTP | `Invoke-WebRequest -UseBasicParsing http://localhost:3000/login` | HTTP 200. |
| Đăng nhập | Mở `/login` bằng trình duyệt | ADMIN đăng nhập được. |
| AI | Mở `/tro-ly` | Lịch sử phiên và textarea tải được. |
| Chứng từ | Mở Kế toán/Đề nghị thanh toán | Không tạo dữ liệu khi chỉ xem. |
| Backup | Mở `/he-thong` | Trạng thái backup không cảnh báo bất thường. |

Sau mỗi hai thao tác kiểm tra bằng trình duyệt, ghi lại thông tin quan trọng vào file `checks/YYYY-MM-DD-<release>.md` trước khi tiếp tục.

## Backup và phục hồi

Backup production hiện được lưu ngoài GitHub tại thư mục `F:\6.Sao lưu hệ thống\`. Các script trong `windows/` và `web/scripts/backup.mjs` là nguồn hướng dẫn chính. Không xóa backup cũ khi chưa có backup mới đã kiểm tra. Khi phục hồi, dừng app, giữ nguyên bản backup gốc, ghi rõ thời điểm và lý do, sau đó kiểm tra migration/schema và route trước khi cho nhân viên dùng lại.

## Xử lý lỗi build Docker

Build Next.js production có thể lâu do Turbopack và bước export layer Docker. Không kết luận thất bại chỉ vì terminal hết thời gian chờ; kiểm tra `docker image inspect zenithtasks-app:latest`, log build và `docker compose ps`. Nếu image chưa được tạo, chạy lại `docker compose build app` với thời gian chờ đủ dài. Không chạy nhiều build chồng lên nhau và không xóa container database để chữa lỗi build app.

## Xử lý approval AI

Approval được lưu trong bảng `AssistantApproval`. Khi một preview hết hạn, hệ thống chuyển trạng thái sang `EXPIRED`; khi ADMIN bấm hủy là `REJECTED`. Không tự chuyển PENDING thành APPROVED bằng SQL. Nếu cần dọn một approval thử nghiệm đã quá hạn, chỉ xử lý khi xác định đúng `id`, `toolName`, `expiresAt`, user và conversation; ghi lại lý do trong `checks/` và không sửa Attendance, tiền, lương hoặc hồ sơ thật.

## Quy tắc an toàn nghiệp vụ

Các thao tác tiền, lương, hồ sơ y tế, xóa khách, sửa sau 24 giờ và thay đổi code đều cần quyền server-side, preview, xác nhận ADMIN và audit. Không dùng dữ liệu test chưa xác định để thử nút xác nhận. Khi cần kiểm tra tool mới, ưu tiên action đọc hoặc tạo preview; chỉ ghi thật khi chủ dự án đã xác nhận hồ sơ/chứng từ thử nghiệm.

## Khi ứng dụng không lên

Trước hết kiểm tra `docker compose ps`, `docker compose logs --tail=200 app` và `docker compose logs --tail=200 db`. Nếu database healthy nhưng app lỗi build/runtime, giữ nguyên database và backup, quay lại image/app commit gần nhất đã biết là chạy được. Nếu migration lỗi, dừng triển khai, không reset database, lưu log vào `checks/` và xử lý migration bằng bản sửa có review.

## Thông tin cần ghi vào biên bản release

Mỗi biên bản phải có commit code, commit tài liệu, CI conclusion, thời gian deploy, image digest, container status, database migration status, HTTP status, smoke test đã làm, approval hoặc dữ liệu test đã xử lý và các việc chưa thực hiện. Biên bản không được ghi password, token, số điện thoại đầy đủ hoặc nội dung hồ sơ khách.
