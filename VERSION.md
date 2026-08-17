# ZenithTasks — Trạng thái phiên bản hiện tại

> **Phiên bản nội bộ:** `2026.08.18-r1`<br>
> **Commit chuẩn nội dung:** [`87c131c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/87c131c)<br>
> **Ngày cập nhật:** 18/08/2026<br>
> **Trạng thái:** Đã build/test production; đã backup và áp dụng migration trên máy vận hành phòng khám ngày 18/08/2026.

## Quy tắc đọc tài liệu

Đây là file đầu tiên cần đọc khi một lập trình viên hoặc AI tiếp quản dự án. Không suy đoán tính năng từ giao diện hoặc từ một commit cũ. Hãy kiểm tra commit mới nhất trên nhánh `master`, đọc file này, sau đó đọc [`web/BAN-GIAO.md`](web/BAN-GIAO.md) và [`ROADMAP.md`](ROADMAP.md).

> **Nguồn sự thật:** mã nguồn và migration trên nhánh `master` là nguồn thực thi; `VERSION.md` mô tả trạng thái; `CHANGELOG.md` mô tả lịch sử thay đổi; `web/BAN-GIAO.md` mô tả kiến trúc và quy tắc vận hành. Nếu các tài liệu mâu thuẫn với mã nguồn, phải dừng và cập nhật tài liệu sau khi xác minh.

## Nền tảng kỹ thuật

Ứng dụng chính nằm trong thư mục `web/`, sử dụng Next.js 16, React 19, TypeScript, Tailwind v4, Prisma 7 và PostgreSQL. Ứng dụng được vận hành bằng Docker; các script trong `windows/` hỗ trợ cài đặt, cập nhật và sao lưu trên máy Windows của phòng khám.

## Các nhóm tính năng đã có trong phiên bản này

| Nhóm | Trạng thái và vị trí chính |
|---|---|
| Hồ sơ khách và điều trị | Hồ sơ khách, hồ sơ điều trị, dịch vụ, vật tư, ảnh trước/sau, cảnh báo an toàn y khoa, phiếu đồng ý và cổng khách hàng. |
| Tài chính | Tính tổng dịch vụ, thanh toán, công nợ, QR VietQR nhập số tiền, khóa giao dịch theo hồ sơ, bảng lương, hoa hồng, thu–chi và báo cáo. |
| Phân bổ doanh thu | `web/src/lib/revenue-attribution.ts`; một nhân sự kiêm hai vai trò không bị đếm đôi; hồ sơ phối hợp có thể chia tỷ lệ đủ 100% tại tab `Phối hợp DS`. |
| Hộp thư đa kênh | Facebook Messenger và Zalo OA qua webhook; hiển thị Page/OA, hội thoại, ảnh/tệp, trả lời, mẫu trả lời nhanh, phân công, trạng thái và SLA. |
| Thông báo | Web Push cho thiết bị đã bật thông báo; webhook tin đến cập nhật hội thoại và gửi thông báo nền. |
| Trợ lý AI | Đọc dữ liệu, xuất bảng, ưu tiên khách, cảnh báo tài chính, chuẩn bị sửa lương, ghi nhận thanh toán, tạo follow-up và tạo lịch hẹn; có upload/đọc TXT, CSV, JSON, Word, Excel, PDF, feedback correction và nhập giọng nói; thao tác ghi cần bản xem trước và xác nhận. |
| Dashboard và phân tích | Trung tâm điều hành hôm nay, tin chưa đọc, cảnh báo tài chính, phễu, RFM, nguy cơ rời bỏ, LTV và ROI marketing. |
| Kho và vận hành | Giá vốn, tồn kho, BOM vật tư, nhập nhiều dòng, cảnh báo hạn dùng, việc hôm nay, đầu ca lễ tân và sao lưu tự động. |
| Bảo mật và audit | Phân quyền theo module/hành động, audit thao tác nhạy cảm, mã hóa số điện thoại, bảo vệ ảnh bằng phiên hoặc vé ký, CSP và backup status; chứng từ tiền/lương chỉ ADMIN ghi sổ, sổ tư vấn khóa sửa sau 24 giờ, thỏa thuận nhân sự lưu version/snapshot. |

## Các migration gần đây cần biết

| Migration | Mục đích |
|---|---|
| `20260817110000_push_subscriptions` | Lưu thiết bị đăng ký Web Push. |
| `20260817140000_assistant_approvals` | Lưu bản xem trước và trạng thái xác nhận thao tác của AI. |
| `20260817160000_case_revenue_allocations` | Lưu phân bổ doanh thu theo hồ sơ, người, vai trò và tỷ lệ. |
| `20260817170000_conversation_workflow` | Lưu trạng thái hội thoại, người phụ trách, thời điểm tin đến và hạn SLA. |
| `20260818100000_finance_consultation_hr_ai` | Thêm hoa hồng điều chỉnh riêng, chứng từ thanh toán, sổ tư vấn điện tử, thỏa thuận nhân sự, file/feedback AI. **Đã áp dụng trên production ngày 18/08/2026.** |

Migration là **bổ sung dữ liệu, không được tự xóa hoặc reset database**. Khi triển khai production phải dùng `prisma migrate deploy`, không dùng `prisma db push`.

## Kiểm tra chất lượng gần nhất

Commit chuẩn đã được kiểm tra bằng Prisma generate, TypeScript, Vitest và Next production build. Lần kiểm tra cuối có **45 file test và 296/296 test đạt**, TypeScript, Prisma validate và Next production build đạt. Khi sửa nghiệp vụ tiền, lương, công nợ, phân quyền hoặc webhook, phải bổ sung test hồi quy trước khi commit.

## Quy trình cập nhật máy vận hành

Trên máy Windows của phòng khám, sao lưu trước nếu bản cập nhật có migration; sau đó chạy `windows\\Sua-Loi.bat` và khởi động lại ứng dụng. Không chép file `.env` thật lên GitHub. Sau cập nhật cần kiểm tra tối thiểu: đăng nhập, một hồ sơ, bảng lương, QR, hộp thư, AI và backup status tại `/he-thong`.

## Những phần chưa tự động hoàn toàn

Đối soát tiền ngân hàng tự động vẫn cần API/webhook của ngân hàng hoặc nhà cung cấp đối soát. SMS/Email tự động và tổng đài điện thoại thật cần tài khoản nhà cung cấp riêng. Lịch chăm sóc sau dịch vụ không được tự đoán theo ngày cố định vì phải phụ thuộc từng dịch vụ và chỉ định của phòng khám. AI không được tự sửa code production, tự xóa dữ liệu hoặc tự thực hiện hành động tài chính mà không có quyền và xác nhận.

## Cách xác định bản mới nhất

Chạy các lệnh sau tại thư mục gốc:

```bash
git fetch origin
git checkout master
git pull --ff-only origin master
git log -1 --oneline
```

Sau đó đối chiếu commit hiển thị với trường **Commit chuẩn hiện tại** ở đầu file này. Nếu khác, đọc `CHANGELOG.md` và cập nhật lại tài liệu trước khi bắt đầu thay đổi tiếp theo.
