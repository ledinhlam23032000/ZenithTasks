# ZenithTasks — Trạng thái phiên bản hiện tại

> **Phiên bản nội bộ:** `2026.08.28-v2-ai-native`<br>
> **Commit master:** phải đối chiếu trực tiếp bằng `git rev-parse HEAD` và `git ls-remote origin refs/heads/master`; không cố định một SHA trong tài liệu phát hành.<br>
> **Ngày cập nhật:** 28/08/2026<br>
> **Trạng thái:** Nền tảng Quản trị Đa Tổ Chức AI-Native đã hoàn tất tích hợp toàn diện. Đã qua kiểm thử 94 test files / 467 tests (100% PASS), TypeScript type-check nghiêm ngặt 0 lỗi. Bao gồm: AI Job Execution Engine & Tool Dispatcher, Global AI-to-Child AI Orchestration, Setup Wizard "Tạo Đơn Vị Mới" 5 Preset Templates & Lego Modules, Universal Command Palette (`Ctrl + K`), và bộ kiểm thử bảo mật cô lập đa đơn vị. Dữ liệu phòng khám cũ được bảo vệ an toàn 100%.

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
| Trợ lý AI | AI Admin Gateway hiện có thêm policy/adapter L0–L5, capability/project scope, sensitive-read purpose/confirmation, clarification A/B/C/D tạo draft inactive và chặn an toàn L5; không tự xóa/chấm dứt/deploy. |
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
| `20260824000000_operating_framework_v2` | Project/organization/position/membership/mechanism registry và simulation rule engine. **Đã apply QA; theo log clinic ngày 24/08/2026 đã apply production.** |
| `20260824003000_ai_training_studio` | Agent profile/dataset/example/prompt/evaluation nền tảng. **Đã apply QA và production theo log clinic ngày 24/08/2026; MVP dashboard/demo seed, chưa phải full training lab.** |
| `20260824010000_workspace_tasks` | Task project-local với projectId bắt buộc, status/priority, query scoped, membership và audit. **Đã deploy production-like qua updater ở commit 41aa7fc; migration/status up to date.** |
| `20260824013000_ai_workspace_scope` | Workspace kind/projectId cho AssistantConversation/Approval, selector AI và governance scope. **Đã apply trên clinic qua `Sua-Loi.bat` ở master d1e5ada; migration/status up to date.** |

Migration là **bổ sung dữ liệu, không được tự xóa hoặc reset database**. Khi triển khai production phải dùng `prisma migrate deploy`, không dùng `prisma db push`.

## Kiểm tra chất lượng gần nhất

Release candidate r16 đã được kiểm tra bằng Prisma generate/validate, TypeScript, Vitest governance targeted **10 test** và Next production build; phần Task/membership và AI workspace scope đã được build/deploy qua updater clinic. Hậu kiểm master d1e5ada cho thấy local/origin cùng SHA, 58 migrations, AI scope apply thành công, app Ready và `/login` HTTP 200. Full Vitest baseline **75 file / 397 test** vẫn là bằng chứng nền trước r16. QA isolated đã kiểm tra migration/data demo, authenticated route smoke, feature flags on/off, role access, server-action seed và live DeepSeek. Log clinic owner cung cấp ngày 24/08/2026 ghi nhận 56 migrations, hai migration V2/Training đã apply, database up to date và Next.js Ready; sau phát hành vẫn phải smoke test nghiệp vụ trên máy clinic. Baseline `origin/master` trước đợt handoff là `5aa5f64`; sau mỗi commit phải xác minh lại bằng Git. Khi sửa nghiệp vụ tiền, lương, công nợ, phân quyền, hồ sơ y tế hoặc webhook, phải bổ sung test hồi quy trước khi commit.

## Quy trình cập nhật máy vận hành

Trên máy Windows của phòng khám, chạy `windows\\Kiem-Tra-Phat-Hanh.bat` trước; nếu repo sạch và cần lấy commit mới thì dùng `windows\\Chay-Zenith.bat`, còn khi cần rebuild/migration có kiểm soát thì dùng `windows\\Sua-Loi.bat`. Health-check kỹ thuật dùng `http://127.0.0.1:3000/login`; Cloudflare origin phải dùng `http://127.0.0.1:3000`, không dùng `localhost`. Sau cập nhật, kiểm tra đăng nhập quản trị, một hồ sơ điều trị, Thu chi, Kế toán, Hệ thống, backup status và public hostname. Không chép file `.env` thật lên GitHub.

## Những phần chưa tự động hoàn toàn

Đối soát tiền ngân hàng tự động vẫn cần API/webhook của ngân hàng hoặc nhà cung cấp đối soát. SMS/Email tự động và tổng đài điện thoại thật cần tài khoản nhà cung cấp riêng. Lịch chăm sóc sau dịch vụ không được tự đoán theo ngày cố định vì phải phụ thuộc từng dịch vụ và chỉ định của phòng khám. AI Admin Gateway có policy/capability/approval phù hợp trong phạm vi đã triển khai; L5 nguy hiểm vẫn bị chặn vì workflow hai người chưa hoàn chỉnh. Thay đổi code vẫn phải đi qua diff, test, backup và triển khai có kiểm soát, không sửa mù trực tiếp trên production.

## Cách xác định bản mới nhất

Chạy các lệnh sau tại thư mục gốc:

```bash
git fetch origin
git checkout master
git pull --ff-only origin master
git log -1 --oneline
```

Sau đó đối chiếu commit hiển thị với trường **Commit chuẩn hiện tại** ở đầu file này. Nếu khác, đọc `CHANGELOG.md` và cập nhật lại tài liệu trước khi bắt đầu thay đổi tiếp theo.
