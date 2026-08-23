# Changelog ZenithTasks

Tài liệu này ghi các thay đổi đã được đẩy lên nhánh `master`. Commit mới hơn nằm ở phía trên. Phiên bản mô tả đầy đủ hiện tại nằm trong [`VERSION.md`](VERSION.md).

## 2026-08-24 — Operating Framework V2, AI clarification và governance QA

- Commit master: [`128b088`](https://github.com/ledinhlam23032000/ZenithTasks/commit/128b0889a918e9a1e5314457b2e5bd4b551b77b9).

- Khôi phục và tích hợp additive V2 operating framework: project, membership, đơn vị, vị trí, assignment, mechanism definition/version và rule-engine simulation; không hard-code riêng Cellarisca.
- Trợ lý AI nhận diện yêu cầu cơ chế hoa hồng/chiết khấu/revenue sharing, hỏi bốn lựa chọn A/B/C/D có tác động, lưu evidence và tạo draft inactive; UI có nút chọn trực tiếp. Clarification cũ được supersede sau khi đã tạo draft.
- Thêm policy/adapter L0–L5 với capability và project scope. Sensitive read yêu cầu purpose/confirmation preview; L5 xóa/chấm dứt nhân sự/đổi quyền/deploy bị dừng vì workflow hai người duyệt chưa được nối. Không có auto termination/deploy.
- AI Training Studio hiện chỉ là MVP feature-gated dashboard + demo seed TESTING gồm profile/dataset/prompt và bốn examples chưa approved. CRUD/evaluation/release/publish/rollback đầy đủ vẫn deferred.
- QA isolated database `zenith_v2_qa` đã chạy migration, seed/upsert, authenticated route smoke, feature flags on/off, role smoke và server-action seed harness. Production clinic database chưa migrate; không dùng `db push`/`migrate reset`.
- Quality gate sau thay đổi: Prisma validate/generate, TypeScript, Vitest **75 file / 397 test** và Next webpack production build đạt.

## 2026-08-24 — r13: Khôi phục Cloudflare 502 và đồng bộ quy trình phát hành

- Commit master: [`e08d84c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/e08d84c798b1c406066c0dd9e5f701eb94173bc2).
- Route Cloudflare chính giữ nguyên hostname và đổi origin từ `http://localhost:3000` sang `http://127.0.0.1:3000`; public `/login` sau khi owner bấm Save trả HTTP 200. Không reset database, không xóa volume/uploads.
- Đồng bộ `docker-compose.yml`, `.env.example`, launcher/tunnel/update scripts và tài liệu vận hành; các health-check kỹ thuật dùng IPv4 loopback. Thêm `windows/Kiem-Tra-Phat-Hanh.ps1/.bat` là verifier chỉ đọc, không build/reset/migrate/restart/recreate.
- Full quality gate: Prisma generate/validate, TypeScript, Vitest **75 file / 396 test**, Next production build; full ESLint **0 errors / 6 warnings**. Gói AI Governance/V2/Training vẫn để riêng để review, chưa commit/deploy.

## 2026-08-23 — Sua-Loi an toàn khi máy có thay đổi local

- Sửa `windows/Sua-Loi.ps1`: trước khi checkout/reset `master`, nếu working tree có thay đổi tracked hoặc untracked thì tạo `backup/sua-loi-<timestamp>` và `git stash push --include-untracked`; không tự động `stash pop`, không xóa dữ liệu local.
- Sửa `windows/Tu-Dong-Cap-Nhat.ps1` cùng nguyên tắc để cập nhật nền không thể âm thầm làm mất thay đổi của chủ máy. Script vẫn dừng an toàn nếu không tạo được backup/stash.
- Syntax check PowerShell trên máy Windows đạt; khi cập nhật xong, chủ máy có thể xem lại bằng `git stash list` và kiểm tra từng file trước khi khôi phục.

## 2026-08-23 — Vòng đời CTV–nhân viên và lưu trữ mềm

- Đình chỉ, lưu trữ và khôi phục CTV bằng trạng thái mềm; không xóa `Collaborator`, `User`, khách, ca, tài liệu hoặc lịch sử hoa hồng. CTV bị đình chỉ/lưu trữ không nhận khách hoặc lịch mới và không đăng nhập cổng CTV.
- Nút xóa nhân sự chuyển thành **Lưu trữ**; tài khoản bị khóa nhưng chấm công, lương, hồ sơ, audit và quan hệ nghiệp vụ vẫn giữ nguyên để tra cứu/khôi phục.
- Cho phép ADMIN chuyển CTV đã có tài khoản thành nhân viên và nhân viên thành CTV trên cùng `User.id`; profile CTV legacy cùng tên được tái sử dụng, referral được liên kết bằng `collaboratorId`, không tạo tài khoản đôi và không tính lại tiền/hoa hồng.
- Thêm `StaffRoleHistory`/audit cho chuyển đổi role và giữ quyền quản trị 100% ở ADMIN. Migration additive `20260823133000_collaborator_lifecycle` chưa chạy production.

## 2026-08-23 — Sửa đăng ký CTV legacy

- Mở khóa trường tên trong luồng **Đăng ký CTV** của dữ liệu legacy, cho phép đổi sang tên chính thức ngay khi tạo hồ sơ.
- Gửi riêng `legacyName` để liên kết khách, ca, lịch hẹn, lead, payout và đề nghị thanh toán cũ vào `collaboratorId` mới; không tạo CTV rời, không tính lại tiền/hoa hồng.
- Thêm regression test cho luồng đăng ký legacy; sau khi sửa phải chạy `windows\\Sua-Loi.bat` trên máy vận hành và smoke test.

## 2026-08-21 — Hồ sơ dịch vụ thẩm mỹ trong Giấy tờ và khóa tự động 24 giờ

- Đưa toàn bộ form Hồ sơ dịch vụ thẩm mỹ khỏi tab Tư vấn vào khu vực **Giấy tờ**, cùng Phiếu đồng ý và tài liệu bổ sung; tab Tư vấn chỉ còn thông tin tư vấn cốt lõi.
- Đặt tab Giấy tờ làm điểm vào mặc định cho workspace admin/lâm sàng; nút `+ Thêm giấy tờ` vẫn mở hồ sơ, ghi nhận Phiếu đồng ý hoặc upload tài liệu.
- Thêm badge `Thiếu`, `Rà soát` và `Thiếu xác nhận` trên tab để dẫn next action mà không tự áp BOM vật tư.
- Bổ sung auto-lock 24 giờ dựa trên `CaseRecord.updatedAt` ở cả UI và Server Actions; nhân viên chuyển sang chỉ xem, ADMIN vẫn có thể chỉnh/mở khóa. Không thêm migration và không xóa dữ liệu lịch sử.

## 2026-08-21 — Bản vá cập nhật Windows sau r12

- `Sua-Loi.ps1` chuyển local về đúng nhánh `master` bằng `checkout -B master origin/master` rồi `reset --hard`; chỉ cảnh báo file untracked và không tự `git clean` để tránh xóa log/QA/.env của chủ máy.
- Tắt Docker Compose Bake trong bước build và gom stdout/stderr vào log có timestamp, hiển thị mã lỗi thật. Trường hợp `0xc000013a` được nhận diện là tiến trình build bị ngắt giữa chừng, không kết luận nhầm là thiếu migration.
- Kiểm tra exit code riêng cho fetch, checkout, reset, build, compose up và migration; nếu lỗi thì dừng an toàn, giữ container cũ.
- `Xem-Loi.ps1` gom stdout/stderr thành text bình thường, chỉ ghi exit code khi lệnh thật sự thất bại; tránh khối `NativeCommandError` giả do PowerShell redirect stderr của Prisma.
- Đối chiếu remote branch cho thấy các branch cũ đều đã nằm hoàn toàn trong `master`; không có PR mở cần gộp thêm.
- **Nguyên nhân build exit code 1 đã xác định**: file untracked `web/pnpm-workspace.yaml` trên máy Windows chỉ có `allowBuilds` nhưng thiếu `packages`; Docker Compose build context là `./web`, nên `COPY . .` đưa file này vào build stage và `pnpm exec` báo `packages field missing or empty`. Script dọn file này trước build; `.gitignore` và `.dockerignore` cũng chặn tái diễn.

## 2026-08-21 — `2026.08.21-r12`: Hồ sơ dịch vụ thẩm mỹ và bản in sạch hơn

Commit master: [`c2f27f5`](https://github.com/ledinhlam23032000/ZenithTasks/commit/c2f27f50a75f86f1cc9ae47193ff76bf11bba321). Bản vá nghiệp vụ: [#34](https://github.com/ledinhlam23032000/ZenithTasks/pull/34); tài liệu release/checkpoint: [#35](https://github.com/ledinhlam23032000/ZenithTasks/pull/35), [#36](https://github.com/ledinhlam23032000/ZenithTasks/pull/36).

### Giấy tờ hồ sơ điều trị

- Đổi tên **Phiếu tư vấn dịch vụ thẩm mỹ** thành **Hồ sơ dịch vụ thẩm mỹ** trên bản xem trước, bản in, Word, editor và các CTA; URL `/ho-so/[id]/consultation` vẫn giữ để không hỏng liên kết.
- Gộp bản hồ sơ tự sinh, Phiếu đồng ý và tài liệu bổ sung vào một khu vực duy nhất trong tab **Giấy tờ**. Nút **+ Thêm giấy tờ** mở Hồ sơ dịch vụ, ghi nhận Phiếu đồng ý hoặc tải xét nghiệm/PDF/ảnh/Word/Excel.
- Giữ nguyên `ConsultationRecord`, `CaseConsent`, `ConsentTemplate`, `CaseDocument` và dữ liệu lịch sử; không thêm migration và không xóa dữ liệu.

### Mẫu in và kiểm tra

- Bỏ đường dotted filler khỏi Giấy đề nghị thanh toán; giữ gạch chân Quốc hiệu theo đúng mẫu hành chính.
- Ngày ghi nhận: **21/08/2026**. Prisma generate, TypeScript, ESLint các tệp thay đổi, **53 file/334 test** và Next production build đạt; CI push/pull request của PR #34 đều xanh.

## 2026-08-21 — `2026.08.21-r11`

Commit master: [`d31e564`](https://github.com/ledinhlam23032000/ZenithTasks/commit/d31e564). Pull request: [#32](https://github.com/ledinhlam23032000/ZenithTasks/pull/32).

### Nhân sự và Cộng tác viên

- Tách Cộng tác viên khỏi khu vực phân tích thành mục quản trị riêng; admin tạo hồ sơ CTV kèm tài khoản và mật khẩu đăng nhập.
- Thêm định danh `collaboratorId` cho khách, lead, lịch hẹn, hồ sơ điều trị, payout và chứng từ; dữ liệu CTV cũ được backfill theo tên khớp duy nhất. Đổi thông tin CTV đồng bộ phần hiển thị lịch sử nhưng không tính lại tiền.
- Thêm cổng `/cong-tac-vien-cua-toi`: CTV chỉ thấy khách thuộc mình trong cửa sổ 6 tháng và hoa hồng của mình; số điện thoại chỉ hiển thị 5 số cuối. Quyền được chặn ở server-side.
- Tách Nhân sự thành Đang làm/Đã nghỉ việc. Nghỉ việc khóa tài khoản và toàn bộ quyền nhưng giữ nguyên lịch sử; thay đổi vai trò/chức danh/phòng ban ghi `StaffRoleHistory` và audit trên cùng tài khoản.
- Migration `20260821150000_ctv_identity_staff_lifecycle` là additive, chưa chạy production.

### Kiểm tra và bàn giao

- Prisma generate, TypeScript, Vitest **53 file / 332 test**, Next production build và CI PR #32 đều đạt.
- PR #32 đã squash merge vào `master`; chưa chạy backup, migration hoặc restart production.

## 2026-08-21 — Quản trị gọn hơn: mục Hệ thống

### Menu và vận hành quản trị

- Gộp ba lối vào **Tình trạng hệ thống**, **Nhật ký hệ thống** và **Kết nối kênh** thành một mục sidebar **Hệ thống** dành cho ADMIN. Trang `/he-thong` hiện có các thẻ tổng quan, lối vào Nhật ký đầy đủ và lối vào cấu hình Zalo OA/Facebook Page.
- Các route `/nhat-ky` và `/cham-soc/ket-noi` vẫn giữ nguyên, cùng quyền server-side, để bookmark và quy trình vận hành không bị hỏng; chỉ ẩn khỏi sidebar để giảm rườm rà. Hệ thống cũng giữ cảnh báo hoạt động nhạy cảm ngay trên tổng quan.
- Gỡ module **Mẫu phiếu đồng ý** khỏi điều hướng và quyền module. Không xóa các phiếu đồng ý lịch sử hoặc nội dung đã ghi trong hồ sơ; nhân viên vẫn có thể ghi phiếu trực tiếp trong hồ sơ nếu nghiệp vụ cần.
- Cập nhật knowledge map của Trợ lý AI để sử dụng tên Hệ thống mới.

### Trạng thái phát hành

- Thay đổi giao diện/quyền này cần chạy TypeScript, ESLint và test quyền; chưa tự động triển khai sâu hơn các thẻ cảnh báo ngoài phạm vi đã được duyệt.

## 2026-08-21 — `2026.08.21-r10`

Commit master: [`983a447`](https://github.com/ledinhlam23032000/ZenithTasks/commit/983a447). PR liên quan: [#29](https://github.com/ledinhlam23032000/ZenithTasks/pull/29), [#30](https://github.com/ledinhlam23032000/ZenithTasks/pull/30).

### Hồ sơ khách và Phiếu tư vấn điện tử

- Khi tạo khách mới, hệ thống tạo cùng transaction hồ sơ khách, hồ sơ điều trị nháp và `ConsultationRecord`; khi tiếp nhận khách cũ, hồ sơ điều trị mới cũng tự sinh phiếu tư vấn.
- Phiếu tự điền họ tên, mã khách, ngày sinh/tuổi, giới tính, địa chỉ, 5 số cuối điện thoại, sinh hiệu, người tư vấn/bác sĩ, nhu cầu và dịch vụ quan tâm. Checklist tiền sử mặc định **Bình thường**, cho phép chọn **Bất thường** và ghi chú từng mục; dữ liệu boolean cũ vẫn đọc tương thích.
- Có xem trước, HTML A4/in-Lưu PDF, tải Word và editor nội dung in có audit. Nội dung chỉnh được lưu vào `ConsultationRecord.printOverrides`, không thay thế dữ liệu nguồn nhạy cảm.
- Migration `20260821130000_consultation_print_overrides` và backfill idempotent bổ sung phiếu cho hồ sơ cũ thiếu chứng từ khi container khởi động; chạy lại không tạo trùng.

### Thu chi và Đề nghị thanh toán

- Một khoản Chi tự tạo PaymentRequest liên kết và hiển thị ngay trên cùng dòng Thu chi bằng nhãn **Đề nghị thanh toán** cùng mã `DNT-...`; Kế toán mở, duyệt, in và xác nhận trên một liên kết.
- Backfill lịch sử bổ sung phiếu cho khoản Chi cũ thiếu liên kết; bước PAID nhận diện dòng Chi đã có để không tạo giao dịch trùng.
- Bản in bỏ tên tự động dưới Thủ trưởng đơn vị. Layout mới thay border kéo dài toàn dòng bằng đường chấm bám theo chiều dài chữ, giảm khoảng trắng giữa các trường, ngày lập và vùng ký.

### Kiểm tra và tài liệu tiếp quản

- PR #29: Prisma validate, TypeScript, ESLint, shell syntax, **52 file test/329 test** và Next production build đạt.
- PR #30: TypeScript, ESLint PaymentRequest, **5 unit test PaymentRequest** và Next production build đạt; CI push và pull request đều xanh.
- Thêm [`docs/PRODUCT-CAPABILITIES.md`](docs/PRODUCT-CAPABILITIES.md), cập nhật README, `docs/INDEX.md`, `web/BAN-GIAO.md`, `web/DU-AN.md` và VERSION để mọi bản vá về sau có nguồn ghi nhận trên GitHub.
- **Chưa xác nhận triển khai production** cho release này; máy Windows cần chạy `windows\\Sua-Loi.bat`, theo dõi migration/backfill và smoke test trước khi sử dụng thật.

## 2026-08-18 — `2026.08.18-r7`

Commit code: [`c7ffa76`](https://github.com/ledinhlam23032000/ZenithTasks/commit/c7ffa76). Commit Docker Compose: [`ee9c7b0`](https://github.com/ledinhlam23032000/ZenithTasks/commit/ee9c7b0). Commit tài liệu/bàn giao: [`f531973`](https://github.com/ledinhlam23032000/ZenithTasks/commit/f531973).

### Trợ lý AI thành đồng nghiệp số

- Sửa lỗi nghiêm trọng trong parser chấm công: yêu cầu mới nhất luôn thắng tên nhân sự cũ; ngày/giờ được lấy từ lượt phù hợp gần nhất; preview cũ không còn lấn át yêu cầu mới. Cách nói “sớm hơn 8h/muộn hơn 17h” được chuẩn hóa thành giờ biên 07:00/18:00 và hiển thị rõ trong preview.
- Sửa lỗi trả lời mâu thuẫn “đã thực hiện” rồi lại “chưa thực hiện”. Câu hỏi trạng thái nay đọc `AssistantApproval` thật; chỉ `APPROVED` mới được báo đã thực hiện. ADMIN có thể nhắn “làm đi”, “xác nhận” hoặc “tiến hành” để xác nhận approval PENDING bằng lời.
- Preview chấm công PENDING cũ trong cùng phiên được đánh dấu thay thế khi có yêu cầu chấm công mới; khi tải lại phiên, approval đã xử lý hoặc stale không còn hiện nút xác nhận nhầm.
- Thêm timeline các bước AI đã làm, trạng thái “đang phân tích và chia nhỏ các bước”, giao diện đồng nghiệp số, nút tạo phiên mới và nút xóa vĩnh viễn cuộc trò chuyện. Xóa phiên chỉ xóa message/approval liên quan, không xóa hồ sơ nghiệp vụ.
- Thêm tool `create_work_plan` để AI chia mục tiêu thành nhiệm vụ chính/phụ và lưu vào module Kế hoạch sau preview/approval.
- Thêm `AI_AGENT_MODEL`; production dùng `deepseek-reasoner` cho planner Agent, còn `AI_MODEL=deepseek-chat` giữ cho tác vụ AI mặc định. Docker Compose đã truyền biến model riêng vào container.

### Kiểm tra và triển khai

- TypeScript đạt; Vitest: **46 file, 306/306 test đạt**; riêng parser chấm công có 5 test và ai.ts có test model Agent riêng.
- Next.js production build đạt; CI GitHub Actions của `c7ffa76` và `ee9c7b0` đều **success**.
- Production Windows đã pull code/compose mới, recreate app; database healthy, 49 migration, schema up to date và `/login` HTTP 200.
- Biên bản kiểm chứng nằm tại [`checks/2026-08-18-r7-ai-colleague-production.md`](checks/2026-08-18-r7-ai-colleague-production.md).

## 2026-08-18 — `2026.08.18-r6`

Commit chuẩn: [`0f81781`](https://github.com/ledinhlam23032000/ZenithTasks/commit/0f81781).

### Registry AI Admin mở rộng

- AI ADMIN có thêm tool đọc hồ sơ khách theo mã với số điện thoại chỉ hiện 5 số cuối, sửa hồ sơ có mã hóa/kiểm tra trùng số, và xóa hồ sơ vĩnh viễn sau preview; khi xóa sẽ hoàn kho vật tư trong transaction trước khi xóa dữ liệu liên quan.
- AI có thể cập nhật Sổ tư vấn điện tử qua action nghiệp vụ thật, giữ nguyên các trường không nêu và tôn trọng quy tắc trong 24 giờ; bản ghi quá 24 giờ chỉ ADMIN được sửa và audit ghi rõ sửa muộn.
- AI có thể lập Đề nghị thanh toán PENDING kể cả khoản nhỏ như gói tăm 3.000đ, sau đó ADMIN có thể duyệt, từ chối hoặc ghi sổ đã thanh toán. CashTransaction chỉ được sinh ở bước PAID.
- Các tool mới đều kiểm tra quyền server-side, đối chiếu dữ liệu thật trước approval, lưu preview/approval/audit và không tin role hoặc mã do model tự đoán.

### Kiểm tra và triển khai

- Prisma validate/generate đạt; TypeScript đạt.
- Vitest: **46 file, 303/303 test đạt**, trong đó có test hồi quy knowledge map AI.
- Next.js production build đạt; GitHub Actions CI cho `0f81781` kết luận **success**.
- Không có migration mới ở r6; production vẫn có 49 migration, database healthy, Prisma báo schema up to date và `/login` HTTP 200.
- Image production r6 đã được build/recreate trên máy Windows; các thông tin kỹ thuật chi tiết được ghi trong biên bản bàn giao/checkpoint nội bộ.

### Chuẩn hóa tài liệu tiếp quản

- Thêm [`docs/INDEX.md`](docs/INDEX.md) làm chỉ mục nguồn sự thật và thứ tự đọc.
- Thêm [`docs/AI-ADMIN-GATEWAY.md`](docs/AI-ADMIN-GATEWAY.md) mô tả registry, quyền, preview, approval, audit và workflow thay đổi code.
- Thêm [`docs/OPERATIONS-RUNBOOK.md`](docs/OPERATIONS-RUNBOOK.md) cho backup, cập nhật Windows, migration, smoke test và xử lý sự cố.
- Đồng bộ README root, `web/README.md`, `web/BAN-GIAO.md`, `web/CLAUDE.md`, `web/DEPLOY.md` và biên bản bàn giao; các lệnh phát triển chuẩn dùng pnpm.

## 2026-08-18 — `2026.08.18-r5`

Commit chuẩn: [`d815f23`](https://github.com/ledinhlam23032000/ZenithTasks/commit/d815f23).

### Workflow thay đổi code có kiểm soát

- Khi ADMIN yêu cầu AI thay đổi cơ chế hoặc code, AI tạo một PlanTask cha và 5 bước con: phân tích phạm vi, soạn diff để ADMIN xem, chạy kiểm thử, backup/migration và triển khai/kiểm tra.
- Workflow vẫn giữ nguyên nguyên tắc không sửa mù production: thay đổi nhạy cảm phải có preview, approval, audit; thay đổi code phải có diff, test, backup và đường lui.
- Metadata checklist được ghi vào audit để người vận hành và AI tiếp quản sau này biết kế hoạch đã được tạo như thế nào.

### Kiểm tra và trạng thái triển khai

- Prisma validate/generate đạt.
- TypeScript đạt.
- Vitest: **46 file, 302/302 test đạt**.
- Next.js production build đạt.
- GitHub Actions CI cho `d815f23` đã hoàn tất với kết luận **success**.
- Không có migration mới ở r5; production đã có 49 migration và cần đồng bộ image/code r5 từ commit này.

## 2026-08-18 — `2026.08.18-r4`

Commit chuẩn: [`efce179`](https://github.com/ledinhlam23032000/ZenithTasks/commit/efce179).

### AI Admin Gateway có giám sát

- Mở rộng Agent theo hướng trợ lý thực thi nội bộ: không dùng `propose_system_change` để thay cho nghiệp vụ đã có tool; registry tool được mở rộng tiếp theo từng module.
- Thêm knowledge map cho Chấm công và AI Admin Gateway, ghép lịch sử hội thoại để không hỏi lại thông tin đã có trong các lượt trước.
- Thêm `bulk_upsert_attendance`: chấm công nhiều ngày cho một nhân sự, upsert theo khóa nhân sự/ngày, transaction, audit và cập nhật lại các trang Chấm công/Lương/Kế toán.
- Với lệnh rõ như “từ 2/8 đến 18/8, sáng 8h, chiều 17h, chưa nghỉ ngày nào”, AI tạo preview một lần; ADMIN bấm xác nhận để thực hiện, không tạo bản ghi chấm công trùng.

### Lưu trữ phiên trò chuyện

- Thêm `AssistantConversation` và `AssistantMessage`, liên kết `AssistantApproval` với phiên.
- Lưu câu hỏi, câu trả lời, preview, approval, kết quả thực thi, hủy và metadata; đổi trang hoặc tải lại vẫn khôi phục được lịch sử.
- Thêm sidebar các phiên gần đây, tiêu đề tự sinh từ câu hỏi đầu tiên và nút “Cuộc trò chuyện mới” để archive phiên cũ.

### Kiểm tra

- Prisma validate/generate đạt.
- TypeScript đạt.
- Vitest: **46 file, 302/302 test đạt**; riêng parser chấm công đạt 3/3.
- Next.js production build đạt.
- Migration `20260818120000_ai_admin_gateway` đã được áp dụng trên máy phòng khám ngày 18/08/2026 sau khi phát hành r4.

## 2026-08-18 — `2026.08.18-r3`

Commit chuẩn: [`989c850`](https://github.com/ledinhlam23032000/ZenithTasks/commit/989c850).

### Sửa Trợ lý AI sau kiểm tra thực tế

- Sửa lỗi action `none` trước đây chỉ trả lời kiểu “đã hiểu yêu cầu” mà chưa giải thích nội dung.
- AI nay có bước tạo câu trả lời cuối dựa trên `BUSINESS_RULES_KNOWLEDGE` và số liệu hiện tại; nếu câu hỏi thuộc nhóm hoa hồng thực thu hoặc Đề nghị thanh toán khoản nhỏ, có fallback nghiệp vụ để không trả lời rỗng/chung chung.
- Đã kiểm tra bằng phiên ADMIN: AI giải thích đúng ví dụ dịch vụ 100.000.000đ trả 5.000.000đ/tháng chỉ tính hoa hồng trên 5.000.000đ thực thu; khoản tăm 3.000đ đi qua PENDING → ADMIN duyệt → PAID tạo đúng một CashTransaction EXPENSE liên kết.

### Triển khai vận hành

- Đã backup `F:\\6.Sao lưu hệ thống\\zenith-2026-08-18_0857.zip`.
- Đã build/recreate image Docker mới trên máy Windows; database healthy, Prisma báo không còn migration pending và `/login` HTTP 200.
- Đã gỡ cờ bắt buộc đổi mật khẩu theo xác nhận trực tiếp của ADMIN, giữ nguyên passwordHash; đã logout/login lại để tạo JWT mới.

## 2026-08-18 — `2026.08.18-r2`

Commit chuẩn: [`4ba1310`](https://github.com/ledinhlam23032000/ZenithTasks/commit/4ba1310).

### Chứng từ, Thu–chi và Kế toán

- Từ Sổ thu–chi, ADMIN có thể chọn **Lập giấy đề nghị thanh toán trước**, dùng được cho khoản rất nhỏ như gói tăm 3.000đ. Phiếu được tạo PENDING và chưa ghi dòng chi cho đến khi được duyệt và thanh toán.
- Khi ghi PAID, PaymentRequest tạo đúng một CashTransaction EXPENSE có `paymentRequestId`; Sổ thu–chi hiển thị số phiếu/trạng thái và liên kết ngược tới bản in. Dòng đã liên kết bị khóa sửa/xóa trực tiếp để tránh lệch sổ.
- Khu vực Kế toán có **Trung tâm chứng từ** để mở/in Đề nghị thanh toán, bảng lương, Sổ thu–chi và các file xuất theo tháng; số lương dùng cùng read-model với bảng lương chính.

### Trợ lý AI ADMIN

- Planner AI được cấp mặc định kho kiến thức bản đồ vận hành của hệ thống, gồm hồ sơ, hộp thư, lương/hoa hồng, Thu–chi, Kế toán, Đề nghị thanh toán, Kho, Nhân sự, Phân quyền và Nhật ký.
- AI được hướng dẫn phân biệt PaymentRequest với CashTransaction, biết khoản chi nhỏ cũng phải có thể lập chứng từ và phải dùng read tool khi hỏi số liệu cụ thể; thao tác ghi vẫn bắt buộc preview, audit và ADMIN xác nhận.
- Bộ nhớ dài hạn của nhiệm vụ đã ghi rõ AI ADMIN là workstream bắt buộc, không được bỏ quên khi hoàn tất phần tài chính.

### Kiểm tra

- Prisma validate/generate đạt.
- TypeScript đạt.
- Vitest: **45 file, 299/299 test đạt**.
- Next.js production build đạt.
- Commit này chưa được áp dụng lên máy vận hành; cần backup và build/recreate Docker trước khi chạy migration nếu migration pending.

## 2026-08-18 — `2026.08.18-r1`

Commit chuẩn nội dung: [`87c131c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/87c131c).

### Tài chính, lương và chứng từ

- Chuyển hoa hồng tự động sang căn cứ tiền khách thực tế đã thanh toán theo từng Payment; khách trả góp đến đâu tính đến đó.
- Tách `commissionOverride` khỏi hoa hồng tự động để không cộng đôi khi kế toán điều chỉnh thủ công.
- Thêm giấy đề nghị thanh toán tại `/ke-toan/de-nghi-thanh-toan`: tạo phiếu, ADMIN duyệt/từ chối, ghi sổ PAID, in Word/HTML và liên kết CashTransaction.
- Luồng chi lương và hoa hồng cộng tác viên tự tạo chứng từ PAID liên kết với phiếu lương/CTV; hoàn tác sẽ hủy liên kết phù hợp.

### Sổ tư vấn và hồ sơ nhân sự

- Thêm sổ tư vấn điện tử gồm hành chính bổ sung, sinh hiệu, 18 câu sàng lọc, nút đánh dấu nhanh, mong muốn, hiện trạng, kết quả dự tính, chỉ định và xác nhận khách.
- Thêm giới hạn sửa sổ tư vấn trong 24 giờ; sửa sau hạn chỉ ADMIN và bắt buộc audit; có route in sổ tư vấn.
- Thêm hồ sơ thỏa thuận bảo mật và không cạnh tranh/không lôi kéo với version, snapshot nội dung, trạng thái nháp/đã ký/thu hồi, thời hạn và route in.

### AI quản trị

- Cho phép upload và trích xuất nội dung TXT, CSV, JSON, Word, Excel, PDF; file tối đa 15MB và tự hết hạn sau 30 ngày.
- Thêm feedback đúng/cần sửa để lưu thành bộ nhớ phản hồi theo tài khoản; thêm nhập câu hỏi bằng giọng nói trên trình duyệt.
- Giữ nguyên whitelist tool, preview và ADMIN approval; AI không tự sửa code production, tiền, lương hoặc hồ sơ y tế.

### Kiểm tra và triển khai production

- 45 file test, 296/296 test đạt.
- Prisma validate, TypeScript và Next.js production build đạt.
- Đã lưu checkpoint bộ nhớ nhiệm vụ dài trong `.task-memory/` và biên bản tại `UPGRADE-HANDOFF-2026-08.md`.
- Đã tạo backup production tại `F:\\6.Sao lưu hệ thống\\zenith-2026-08-18_0134.zip` trước khi cập nhật.
- Đã recreate `zenithtasks-app-1` bằng image mới; database vẫn healthy, migration `20260818100000_finance_consultation_hr_ai` đã áp dụng và `prisma migrate status` báo schema up to date.
- Endpoint `http://localhost:3000/login` trả HTTP 200 sau cập nhật.
- Sửa `web/Dockerfile` và quy trình CI để dùng `pnpm install --frozen-lockfile`, tương thích với `pnpm-lock.yaml` và các thư viện đọc file mới; vì vậy `Sua-Loi.bat` build image thành công thay vì dừng ở bước cài dependency.

## 2026-08-17 — `2026.08.17-r2`

### Tài chính, lương và doanh thu

- Sửa lỗi doanh thu bị đếm đôi khi một nhân sự vừa là tư vấn viên vừa là bác sĩ của cùng hồ sơ.
- Thêm engine phân bổ doanh thu theo hồ sơ tại `web/src/lib/revenue-attribution.ts`.
- Thêm tab `Phối hợp DS` để ADMIN chia doanh thu giữa nhiều nhân sự theo tỷ lệ; tổng tỷ lệ phải đủ 100%.
- Đồng bộ DS phân bổ giữa bảng lương và hiệu suất nhân sự.
- Thêm cảnh báo tài chính cho snapshot lệch, trả vượt, thanh toán không có dịch vụ, giảm giá/voucher bất thường và thanh toán không hợp lệ.
- QR VietQR cho phép nhân viên nhập số tiền bất kỳ trước khi tạo mã.

### AI quản trị

- Thêm tool AI đọc công nợ, bảng lương, xuất file và tổng quan vận hành.
- Thêm xếp hạng khách nên ưu tiên gọi lại.
- Thêm đọc cảnh báo tài chính.
- Thêm luồng tạo follow-up, ghi nhận thanh toán và tạo lịch hẹn.
- Mọi thao tác ghi có bản xem trước, kiểm quyền và xác nhận ADMIN.
- Thêm fallback JSON khi provider AI không hỗ trợ `response_format` dạng JSON Schema.

### Hộp thư và vận hành

- Thêm phân công hội thoại cho nhân viên.
- Thêm trạng thái `OPEN`, `IN_PROGRESS`, `DONE`.
- Tin đến tự mở lại hội thoại và tính SLA theo Facebook/Zalo.
- Thêm mẫu trả lời nhanh trong hộp thư.
- Thêm Timeline khách hàng 360° gồm hồ sơ, lịch hẹn, follow-up, chăm sóc và hội thoại.
- Dashboard có tin chưa đọc và cảnh báo tài chính.

### Kiểm tra

- 44 file test, 296/296 test đạt.
- TypeScript đạt.
- Next.js production build đạt.
- Git working tree sạch tại thời điểm cập nhật.

### Commit liên quan

| Commit | Nội dung |
|---|---|
| [`e9071af`](https://github.com/ledinhlam23032000/ZenithTasks/commit/e9071af) | Revenue attribution core |
| [`d79816c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/d79816c) | QR nhập số tiền |
| [`4162672`](https://github.com/ledinhlam23032000/ZenithTasks/commit/4162672) | Dashboard tin chưa đọc |
| [`30861c6`](https://github.com/ledinhlam23032000/ZenithTasks/commit/30861c6) | Phân công và SLA hộp thư |
| [`827f5ee`](https://github.com/ledinhlam23032000/ZenithTasks/commit/827f5ee) | Cảnh báo tài chính |
| [`f5bad30`](https://github.com/ledinhlam23032000/ZenithTasks/commit/f5bad30) | AI ưu tiên khách và cảnh báo |
| [`585e5c6`](https://github.com/ledinhlam23032000/ZenithTasks/commit/585e5c6) | AI tạo lịch hẹn |
| [`87fb972`](https://github.com/ledinhlam23032000/ZenithTasks/commit/87fb972) | Timeline khách hàng 360° |
| [`5c67b0c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/5c67b0c) | Mẫu trả lời nhanh |
| [`e993fc5`](https://github.com/ledinhlam23032000/ZenithTasks/commit/e993fc5) | Công bố VERSION, CHANGELOG và cập nhật tài liệu bàn giao |

## Quy tắc ghi changelog cho các phiên sau

Mỗi thay đổi nghiệp vụ phải ghi ngày, mục đích, tệp hoặc migration chính, ảnh hưởng dữ liệu, test đã chạy và việc chủ dự án cần làm. Không ghi “đã xong” nếu mới chỉ sửa giao diện mà chưa kiểm tra luồng server, quyền và dữ liệu.
