# ZenithTasks — Trạng thái phiên bản hiện tại

> **Phiên bản nội bộ:** `2026.08.24-r13`<br>
> **Commit master:** [`e08d84c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/e08d84c798b1c406066c0dd9e5f701eb94173bc2)<br>
> **PR gần nhất:** cập nhật trực tiếp trên `master` theo chỉ đạo owner<br>
> **Ngày cập nhật:** 24/08/2026<br>
> **Trạng thái:** Đã đồng bộ quy ước origin kỹ thuật IPv4, script cập nhật/recovery, Docker Compose, mẫu môi trường và tài liệu vận hành; route Cloudflare chính đã đổi sang `http://127.0.0.1:3000` và public `/login` đã xác nhận HTTP 200. Không có migration trong commit này, không reset database/volume. Gói AI Governance/V2/Training đang để riêng trong working tree để review, chưa commit/deploy. Bộ tài liệu tiếp quản chuẩn nằm tại [`docs/INDEX.md`](docs/INDEX.md), bản đồ năng lực nằm tại [`docs/PRODUCT-CAPABILITIES.md`](docs/PRODUCT-CAPABILITIES.md).

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
| Trợ lý AI | AI Admin Gateway có knowledge map vận hành, tool chấm công hàng loạt, parser ưu tiên yêu cầu mới nhất, trạng thái approval thật, xác nhận bằng lời ADMIN, timeline đồng nghiệp số, xóa phiên, lập kế hoạch nhiệm vụ chính/phụ, upload/đọc file, feedback, nhập giọng nói và `AI_AGENT_MODEL` reasoning riêng. |
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
| `20260818100000_finance_consultation_hr_ai` | Thêm hoa hồng điều chỉnh riêng, chứng từ thanh toán, sổ tư vấn điện tử nền, thỏa thuận nhân sự, file/feedback AI. **Đã áp dụng trên production ngày 18/08/2026.** |
| `20260821130000_consultation_print_overrides` | Lưu nội dung chỉnh riêng cho bản in Phiếu tư vấn; migration additive, không thay đổi dữ liệu nguồn. **Đã merge master, chưa xác nhận production.** |
| `20260821150000_ctv_identity_staff_lifecycle` | Thêm role CTV, liên kết CTV theo ID, cửa sổ hiển thị 6 tháng, trạng thái nghỉ việc/lịch sử thăng chức và liên kết payout; additive, có backfill tên khớp duy nhất. **Đã merge master, chưa xác nhận production.** |
| `20260818120000_ai_admin_gateway` | Lưu AssistantConversation/AssistantMessage, liên kết approval với conversation và hỗ trợ chấm công hàng loạt qua AI. **Đã áp dụng trên production ngày 18/08/2026.** |

Migration là **bổ sung dữ liệu, không được tự xóa hoặc reset database**. Khi triển khai production phải dùng `prisma migrate deploy`, không dùng `prisma db push`.

## Kiểm tra chất lượng gần nhất

Release r13 đã được kiểm tra bằng Prisma generate/validate, TypeScript, Vitest **75 file / 396 test**, Next production build và full ESLint **0 errors / 6 warnings**. `origin/master` hiện ở commit `e08d84c`. Public smoke test sau khi owner lưu route Cloudflare trả HTTP 200; Windows app/db Up, app local IPv4 HTTP 200, Cloudflared Running và metrics HTTP 200. Commit này không có migration mới. Khi sửa nghiệp vụ tiền, lương, công nợ, phân quyền, hồ sơ y tế hoặc webhook, phải bổ sung test hồi quy trước khi commit.

## Quy trình cập nhật máy vận hành

Trên máy Windows của phòng khám, chạy `windows\\Kiem-Tra-Phat-Hanh.bat` trước; nếu repo sạch và cần lấy commit mới thì dùng `windows\\Chay-Zenith.bat`, còn khi cần rebuild/migration có kiểm soát thì dùng `windows\\Sua-Loi.bat`. Health-check kỹ thuật dùng `http://127.0.0.1:3000/login`; Cloudflare origin phải dùng `http://127.0.0.1:3000`, không dùng `localhost`. Sau cập nhật, kiểm tra đăng nhập quản trị, một hồ sơ điều trị, Thu chi, Kế toán, Hệ thống, backup status và public hostname. Không chép file `.env` thật lên GitHub.

## Những phần chưa tự động hoàn toàn

Đối soát tiền ngân hàng tự động vẫn cần API/webhook của ngân hàng hoặc nhà cung cấp đối soát. SMS/Email tự động và tổng đài điện thoại thật cần tài khoản nhà cung cấp riêng. Lịch chăm sóc sau dịch vụ không được tự đoán theo ngày cố định vì phải phụ thuộc từng dịch vụ và chỉ định của phòng khám. AI Admin Gateway được phép thực hiện nghiệp vụ theo quyền ADMIN và approval; thay đổi code vẫn phải đi qua diff, test, backup và triển khai có kiểm soát, không sửa mù trực tiếp trên production.

## Cách xác định bản mới nhất

Chạy các lệnh sau tại thư mục gốc:

```bash
git fetch origin
git checkout master
git pull --ff-only origin master
git log -1 --oneline
```

Sau đó đối chiếu commit hiển thị với trường **Commit chuẩn hiện tại** ở đầu file này. Nếu khác, đọc `CHANGELOG.md` và cập nhật lại tài liệu trước khi bắt đầu thay đổi tiếp theo.
