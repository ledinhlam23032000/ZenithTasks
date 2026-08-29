# ZenithTasks — Trạng thái phiên bản hiện tại

> **Phiên bản nội bộ:** `2026.08.29-r3-ai-governance`<br>
> **Commit master:** phải đối chiếu trực tiếp bằng `git rev-parse HEAD` và `git ls-remote origin refs/heads/master`; không cố định một SHA trong tài liệu phát hành.<br>
> **Ngày cập nhật:** 29/08/2026<br>
> **Trạng thái:** Wave 2026-08-28→29 vá 17 lỗi thật (bảo mật/tiền/cách ly tenant/AI governance) qua 4 đợt deploy clinic, kèm 3 tính năng lớn hoàn thiện: worker AI job tự động, payroll đa công ty đầy đủ vòng đời (two-person), AI Tổng điều khiển AI con thật. Sau đó (cùng ngày, tiếp phiên) vá thêm 5 hạng mục theo yêu cầu chủ dự án: `generate_commission_draft` dùng dữ liệu thật thay vì AI tự bịa số; AI con bắt buộc mặc định khi tạo company; AI Tổng resume được AI con + xem lịch sử job; bước Verify riêng biệt (Plan→Preview→Approve→Execute→**Verify**→Audit); two-person approval thật cho `delete_customer` (trước đây bị chặn cứng hoàn toàn, không dùng được). Gate: `tsc` 0 lỗi; Vitest unit **495 test PASS**; Vitest integration **40 test PASS trên QA DB thật**. Chi tiết đầy đủ: `.task-memory/multi-company-ai-2026-08-27/checks/`.

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
| `20260826100000_ai_global_workspace` | Thêm `AssistantWorkspaceKind.GLOBAL` — phạm vi tường minh cho AI Tổng (Global Admin AI) nhìn toàn bộ company. |
| `20260826110000_workspace_core_modules` | Bản ghi vận hành project-local đầu tiên (khách/task/lịch hẹn/doanh số) — tách hẳn khỏi Customer/Appointment/Payment/CashTransaction legacy. |
| `20260826120000_workspace_config_versions` | Nền tảng cấu hình project có version. |
| `20260826130000_workspace_ledger_entries` | Nền tảng sổ cái (ledger) project-local. |
| `20260826140000_workspace_payment_reconciliation` | Đối soát thanh toán project-local. |
| `20260826150000_workspace_payroll_runs` | Snapshot lương/hoa hồng project-local (PayrollRun/Line, ZMechanismDefinition/Version). |
| `20260826160000_payroll_two_person_governance` | Thêm mốc approver/finalizer/void riêng cho PayrollRun — nền tảng two-person approval lương đa công ty. |
| `20260826170000_workspace_customer_consent_lifecycle` | Consent và soft-delete cho khách hàng project-local. |
| `20260826180000_workspace_config_proposals` | Đề xuất cấu hình project chờ AI/Admin duyệt. |
| `20260827190000_ai_agent_hierarchy` | ZAiAgent (CHILD/GLOBAL) — CHILD bắt buộc thuộc 1 project, GLOBAL không thuộc project nào; partial unique index đảm bảo chỉ 1 agent ACTIVE/definition. |
| `20260828130000_ai_job_contract` | ZAiJob — hàng đợi job AI Tổng/AI con tường minh, có giới hạn, có audit. |
| `20260828220000_ai_job_approval_and_lifecycle_enums` | Bổ sung 3 giá trị enum schema đã khai nhưng thiếu migration (PENDING_APPROVAL, SUSPENDED, roles) — vá lỗi drift schema/DB phát hiện qua audit. |
| `20260828230000_tenant_scoped_uniques_and_audit_indexes` | Sửa `ZAiAgent.code`/`ZAiJob.idempotencyKey` từ unique toàn cục về đúng phạm vi tenant; thêm index AuditLog theo entity/action/actorId. |
| `20260829220000_assistant_two_person_approval` | `AssistantApprovalStatus.PENDING_SECOND` + `AssistantApproval.firstApprovedById/firstApprovedAt` — two-person approval thật cho `delete_customer` qua AI (MC-21). **Đã apply QA, CHƯA apply clinic — đi cùng đợt deploy tiếp theo.** |

Migration là **bổ sung dữ liệu, không được tự xóa hoặc reset database**. Khi triển khai production phải dùng `prisma migrate deploy`, không dùng `prisma db push`.

## Kiểm tra chất lượng gần nhất

Wave 2026-08-28→29 (17 lỗi vá + worker AI job + payroll đa công ty + AI Tổng điều khiển AI con): gate cuối
`tsc` 0 lỗi, unit **495/495 PASS**, integration **27/27 PASS trên QA DB thật**, đã deploy 4 đợt lên clinic
với backup pg_dump trước mỗi đợt, dữ liệu Customer/Case/Payment xuyên suốt không đổi, `/login` HTTP 200
sau mỗi đợt. Chi tiết: `.task-memory/multi-company-ai-2026-08-27/checks/clinic-deploy4-20260829.md`.

Tiếp phiên cùng ngày (5 hạng mục theo yêu cầu chủ dự án — xem header phía trên): mỗi hạng mục có itest
riêng trên QA thật (bao gồm 1 negative control cho bước Verify và 1 kịch bản xóa khách hàng thật 2-admin
cho two-person approval). Gate cuối: `tsc` 0 lỗi, unit **495/495 PASS**, integration **40/40 PASS trên QA
DB thật**. Migration `20260829220000_assistant_two_person_approval` mới apply QA, **chưa apply clinic**.

QA isolated (`zenithqa`, project riêng, không đụng clinic) dùng cho MỌI kiểm chứng runtime trong wave này
— dump/restore thật, tạo/xóa dữ liệu thật, chạy 2 admin khác nhau cho luồng 2 người duyệt. Baseline lịch sử
trước đó (release r16, 24/08/2026): Prisma generate/validate, TypeScript, Vitest governance, Next build,
hậu kiểm master d1e5ada — xem lịch sử đầy đủ ở Git log nếu cần đối chiếu xa hơn. Khi sửa nghiệp vụ tiền,
lương, công nợ, phân quyền, hồ sơ y tế hoặc webhook, phải bổ sung test hồi quy trước khi commit.

## Quy trình cập nhật máy vận hành

Trên máy Windows của phòng khám, chạy `windows\\Kiem-Tra-Phat-Hanh.bat` trước; nếu repo sạch và cần lấy commit mới thì dùng `windows\\Chay-Zenith.bat`, còn khi cần rebuild/migration có kiểm soát thì dùng `windows\\Sua-Loi.bat`. Health-check kỹ thuật dùng `http://127.0.0.1:3000/login`; Cloudflare origin phải dùng `http://127.0.0.1:3000`, không dùng `localhost`. Sau cập nhật, kiểm tra đăng nhập quản trị, một hồ sơ điều trị, Thu chi, Kế toán, Hệ thống, backup status và public hostname. Không chép file `.env` thật lên GitHub.

## Những phần chưa tự động hoàn toàn

Đối soát tiền ngân hàng tự động vẫn cần API/webhook của ngân hàng hoặc nhà cung cấp đối soát. SMS/Email tự động và tổng đài điện thoại thật cần tài khoản nhà cung cấp riêng. Lịch chăm sóc sau dịch vụ không được tự đoán theo ngày cố định vì phải phụ thuộc từng dịch vụ và chỉ định của phòng khám. AI Admin Gateway có policy/capability/approval phù hợp trong phạm vi đã triển khai. L5 (`delete_customer`) từ 29/08/2026 **đã có two-person approval thật** (PENDING → PENDING_SECOND chờ 1 ADMIN khác → APPROVED) — action L5 khác (termination/permission-change/deploy) chưa có code path thật nên chưa cần workflow, sẽ phải đi qua đúng cơ chế PENDING_SECOND này nếu được thêm sau. **Chưa có UI nào tạo/duyệt AI job của tầng V2 (AI Tổng/AI con multi-company)** — toàn bộ mới chứng minh đúng qua test server/data layer, chưa ai dùng được qua trình duyệt (xem ledger MC-24). Thay đổi code vẫn phải đi qua diff, test, backup và triển khai có kiểm soát, không sửa mù trực tiếp trên production.

## Cách xác định bản mới nhất

Chạy các lệnh sau tại thư mục gốc:

```bash
git fetch origin
git checkout master
git pull --ff-only origin master
git log -1 --oneline
```

Sau đó đối chiếu commit hiển thị với trường **Commit chuẩn hiện tại** ở đầu file này. Nếu khác, đọc `CHANGELOG.md` và cập nhật lại tài liệu trước khi bắt đầu thay đổi tiếp theo.
