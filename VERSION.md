# ZenithTasks — Trạng thái phiên bản hiện tại

> **Phiên bản nội bộ:** `2026.08.21-r10`<br>
> **Commit master:** [`983a447`](https://github.com/ledinhlam23032000/ZenithTasks/commit/983a447)<br>
> **PR gần nhất:** [#29](https://github.com/ledinhlam23032000/ZenithTasks/pull/29), [#30](https://github.com/ledinhlam23032000/ZenithTasks/pull/30)<br>
> **Ngày cập nhật:** 21/08/2026<br>
> **Trạng thái:** Code đã merge master, CI xanh, test/build đạt. Release này bổ sung Phiếu tư vấn điện tử tự sinh có checklist tiền sử và editor/in ấn, backfill dữ liệu lịch sử, hợp nhất Thu chi–Đề nghị thanh toán và bản in thanh toán được căn chỉnh thẩm mỹ. **Chưa xác nhận triển khai production**; cần chạy `windows\\Sua-Loi.bat` và smoke test trên máy vận hành. Bộ tài liệu tiếp quản chuẩn nằm tại [`docs/INDEX.md`](docs/INDEX.md), bản đồ năng lực nằm tại [`docs/PRODUCT-CAPABILITIES.md`](docs/PRODUCT-CAPABILITIES.md).

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
| `20260818120000_ai_admin_gateway` | Lưu AssistantConversation/AssistantMessage, liên kết approval với conversation và hỗ trợ chấm công hàng loạt qua AI. **Đã áp dụng trên production ngày 18/08/2026.** |

Migration là **bổ sung dữ liệu, không được tự xóa hoặc reset database**. Khi triển khai production phải dùng `prisma migrate deploy`, không dùng `prisma db push`.

## Kiểm tra chất lượng gần nhất

Release r10 đã được kiểm tra bằng Prisma validate/generate, TypeScript, ESLint, Vitest, shell syntax, Next production build và CI GitHub Actions. PR #29 đạt **52 file test và 329/329 test**; PR #30 có **5 unit test PaymentRequest** và production build đạt. `origin/master` hiện ở merge commit `983a447`. Release này có migration mới cho nội dung in Phiếu tư vấn; chưa được xác nhận đã chạy trên máy production. Khi sửa nghiệp vụ tiền, lương, công nợ, phân quyền, hồ sơ y tế hoặc webhook, phải bổ sung test hồi quy trước khi commit.

## Quy trình cập nhật máy vận hành

Trên máy Windows của phòng khám, sao lưu trước nếu bản cập nhật có migration; sau đó chạy `windows\\Sua-Loi.bat` và khởi động lại ứng dụng. Với r10, kiểm tra migration `20260821130000_consultation_print_overrides`, log backfill Phiếu tư vấn/Đề nghị thanh toán và smoke test: đăng nhập, tạo hồ sơ mới, checklist tiền sử, xem/in phiếu tư vấn, Thu chi, Kế toán, bảng lương, QR, hộp thư, AI và backup status tại `/he-thong`. Không chép file `.env` thật lên GitHub.

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
