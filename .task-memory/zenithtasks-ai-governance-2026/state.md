# AI Governance Project State

- Updated: 2026-08-23 23:27 GMT+7
- Goal: Hoàn tất AI governance/Training Studio, sau đó quay lại V2, tự test trên máy người dùng và chỉ push bản đã kiểm nghiệm lên master.
- Current phase: Phase 2 — Hoàn tất AI Training Studio và workflow A/B/C/D
- Overall status: active

## Verified

Đã nghiên cứu và ghi lại pattern Cerbos PDP, Langfuse self-host prompt/evaluation/observability và OWASP Agentic Applications 2026 trong `research-findings.md` và `docs/AI-EXECUTIVE-GOVERNANCE-V3.md`.

Đã tạo `web/src/lib/ai-governance.ts`: policy thuần hàm phân loại L0–L5, project scope, capability, dữ liệu y tế/lương, chấm dứt nhân sự, thay đổi quyền, deploy production, deletion, confirmation, required approvals, rollback và field masking.

Đã tạo `web/src/lib/ai-approval-gate.ts`: preview có expiry, status, risk, consequence, affected records, amount, purpose và rollback. AI không tự chạy hành động L5; chấm dứt nhân sự/production/permission/delete yêu cầu workflow và 2 approvals theo default.

Đã thêm unit tests: policy 5/5 và approval 2/2 pass. Prisma validate/generate và TypeScript pass. Training Studio schema `ZAgentProfile`, `ZTrainingDataset`, `ZTrainingExample`, `ZPromptVersion`, `ZEvaluationRun` và migration `20260824003000_ai_training_studio` đã có. Trang `/he-thong/ai-dao-tao` có feature flag `ENABLE_AI_TRAINING_STUDIO` và dashboard tối thiểu.

## Open

- Chưa tích hợp policy gate vào agent tool dispatcher hiện có; mới có pure policy/approval contract.
- Chưa có UI CRUD đầy đủ cho dataset/prompt/evaluation; mới có dashboard/contract/docs.
- Chưa apply migrations trên DB thật.
- V2 cũ trên working tree từng không tồn tại dù lịch sử trước đó tưởng đã có; cần khôi phục/test từ repository thật trước push.

## Next actions

1. Nối `evaluateAiToolRequest` vào agent dispatcher/approval hiện tại mà không phá preview cũ.
2. Hoàn thiện Training Studio basic actions cho tạo agent profile/dataset/example và test dataset.
3. Quay lại khôi phục V2 thật: Dự án, tổ chức, mechanism registry, rule engine và AI clarification UI trong working tree hiện tại.
4. Dựng DB/data demo, chạy smoke test qua browser/local app, regression và webpack build.
5. Cập nhật handoff/README/AGENTS, commit/push master chỉ khi quality gate đạt.

## Quality risks

Không được coi `ADMIN` là bypass policy. Không log full medical/payroll values. Không cho AI tự chạy xóa/chấm dứt/deploy. Không dùng dữ liệu thật trong dataset. Không chạy migration production khi chưa có backup/dry-run.

Tác giả: Manus AI.


## Phase 2 checkpoint — 2026-08-23 23:29 GMT+7

Đã thêm `ai-training-actions.ts` với action ADMIN-only để tạo Agent Profile/Dataset/Prompt demo gồm 4 case không chứa dữ liệu thật: clarification A/B/C/D, cảnh báo L5 chấm dứt nhân sự, cảnh báo L2 dữ liệu y tế và từ chối vượt quyền. Action chỉ chạy khi `ENABLE_AI_TRAINING_STUDIO=true`, profile ở TESTING, examples chưa approved và không publish tự động.

Đã thêm `AiTrainingSeedButton` và hoàn chỉnh trang `/he-thong/ai-dao-tao`; feature flag tắt thì chỉ hiện hướng dẫn, bật thì có counts và nút tạo demo. Prisma validate/generate, TypeScript và 7 governance tests vẫn pass.

Còn thiếu: nối clarification payload vào AI agent hiện có, CRUD/evaluation UI thật và adapter Langfuse/Promptfoo/Cerbos. Các việc này sẽ làm sau khi bản V2 thật được khôi phục và test, để không trộn thêm rủi ro vào quality gate hiện tại.

## Recovery checkpoint — 2026-08-24 02:20 GMT+7

QA source-mounted đã xác nhận master working tree ban đầu không có các file V2/governance dù một snapshot trước đó có ghi nhận chúng. Đã tìm thấy và khôi phục schema V2/Training Studio từ snapshot `6b59c5919ea42f4c23ce1a0b9c6c228f04902d04`, cùng migration, route, rule engine, governance và Training Studio actions từ unreachable recovery commit `aecf5c0401b0a1abe3e7b3e4a4abc756164b1365`. Prisma validate/generate, TypeScript và 11 targeted tests pass sau khôi phục. Chưa commit/push; chưa apply migration vào database clinic thật.

## QA checkpoint — 2026-08-24 03:36 GMT+7

Đã chạy QA cô lập trên database `zenith_v2_qa`, không chạm database/volume clinic root. Migration V2 và Training Studio đã apply trong QA; dữ liệu demo gồm project CELLARISCA-DEMO, Sales unit/position, mechanism commission DRAFT, Training Profile TESTING, dataset active, prompt và 4 examples chưa approve. Authenticated HTTP smoke bằng ADMIN đạt `/dashboard`, `/du-an`, `/du-an/CELLARISCA-DEMO/to-chuc`, `/du-an/CELLARISCA-DEMO/co-che` và `/he-thong/ai-dao-tao` đều HTTP 200 với marker nội dung đúng.

Đã mint session tạm cho 6 role QA từ secret chỉ có ở local QA. ADMIN và MANAGER xem được dashboard/V2 project; ADMIN xem Training Studio; MANAGER và các role SHAREHOLDER/COLLABORATOR/RECEPTION/DOCTOR bị chặn Training Studio hoặc V2 bằng `khong-co-quyen` meta redirect. Harness QA tạm gọi đúng `seedV2DemoAction`: ADMIN trả `ok=true`, action upsert thành công và giữ policy DRAFT; MANAGER nhận HTTP 307 tới `/khong-co-quyen`. Route debug/harness đã xóa khỏi source trước quality gate. QA phải được xem là bằng chứng isolated, không phải production migration.

Clarification A/B/C/D đã có pure contract + 4 tests và UI button cards; metadata được lưu trong conversation, lựa chọn tạo draft inactive có evidence, không activation. Training Studio hiện chỉ là dashboard + demo seed; CRUD/evaluation/release UI đầy đủ vẫn deferred và phải ghi rõ trong docs.

## Current quality-gate phase — 2026-08-24 03:36 GMT+7

- Current phase: Phase 5 — regression, security, build, rollback và cập nhật hồ sơ bàn giao.
- Completed: source review, QA migration/data, feature-on/off smoke, role smoke, authenticated server-action harness, clarification UI/typecheck/targeted tests.
- Next 3 actions: chạy full Prisma/typecheck/Vitest/webpack build; review security/secret/staged diff và cập nhật docs/handoff; chỉ sau đó stage explicit files, commit/push nếu mọi gate đạt.
- Open risks: cần kiểm chứng full build thật, không dựa vào log compile; cần loại toàn bộ QA artifacts khỏi staging; L5 two-person workflow và Training Studio CRUD/evaluation/release chưa delivered; production migration vẫn pending backup/dry-run/explicit confirmation.

## Release checkpoint — 2026-08-24 03:58 GMT+7

Quality gate cuối đạt: `prisma validate`, `prisma generate`, `npx tsc --noEmit`, full Vitest **75 files / 397 tests**, và `npm run build -- --webpack` hoàn tất thành công. Cached diff check và allowlist audit đạt; intended product files đã commit, không stage checks/worktrees/token/env/recovery artifacts.

Commit `128b0889a918e9a1e5314457b2e5bd4b551b77b9` đã push thành công lên `origin/master`; `git ls-remote origin refs/heads/master` trả cùng SHA. Các thay đổi Windows local và `.task-memory/02_state.md`, `.task-memory/06_changelog.md` cũ vẫn ngoài commit, không bị xóa hoặc đưa vào release.

Goal của phiên này hoàn tất. Production clinic vẫn chưa migrate hai migration V2/Training và feature flags chưa được bật trên máy vận hành. Người dùng chỉ nên backup trước, chạy `windows\\Sua-Loi.bat` để cập nhật commit, sau đó kiểm tra workflow clinic trước khi cân nhắc migration/flags theo runbook; không dùng `prisma db push` hoặc `migrate reset`.


## Workspace V4 checkpoint — 2026-08-26 13:45 GMT+7

Đã push commit `27bb015a05010e56715d7e325f7543f208ada7e9` lên `origin/master`. Commit này bổ sung context AI `GLOBAL`, guard Admin-only/explicit project target và migration additive `20260826100000_ai_global_workspace`; sandbox đã xác minh Prisma generate, 11 governance tests và Next build thành công.

Đã tiếp tục P03/P04 nền trong working tree sandbox: migration additive `20260826110000_workspace_core_modules`; các model `ZWorkspaceCustomer`, `ZWorkspaceAppointment`, `ZWorkspaceSale` có `projectId` bắt buộc, index/unique theo project và foreign key tới `ZProject`. Đã tạo `createWorkspaceCustomerAction` với `requireProjectAccess`, không nhập số điện thoại đầy đủ, audit và revalidate; trang `/du-an/[projectId]/khach-hang` chỉ query `ZWorkspaceCustomer`; registry chuyển Customer thành module available với route local. Đã thêm rollback-only SQL check `checks/test-workspace-core-isolation.sql` để kiểm chứng hai project không đọc chéo và bảng legacy `Customer` không đổi.

Bằng chứng sandbox: `prisma validate`, `prisma generate`, direct `tsc --noEmit`, `vitest run src/lib/ai-governance.test.ts` **11/11 pass**, `next build` pass và route `/du-an/[projectId]/khach-hang` được compile. Lần chạy `pnpm exec tsc --noEmit` bị chặn bởi pnpm policy `ERR_PNPM_IGNORED_BUILDS`, sau đó direct local `node_modules/.bin/tsc --noEmit` pass; đây là lỗi quy trình dependency, không phải TypeScript.

Trạng thái: commit Customer foundation chưa commit/push/deploy; cần review diff, commit/push, rồi chờ sidecar Windows kết nối để chạy đúng `windows\\Sua-Loi.bat`. Chưa được tuyên bố Customer hoàn chỉnh: còn edit/soft-delete/consent/detail/history; Appointment/Sales/Finance/Payroll vẫn chưa có action/UI đầy đủ. Không được gọi toàn bộ Dự án là usable hoàn chỉnh.

Next 3 actions:
1. Review migration SQL/diff, thêm targeted static/isolation tests nếu cần, commit/push Customer foundation.
2. Khi clinic reconnect, kiểm tra SHA/compose rồi chạy `Sua-Loi.bat`, xác minh migration 59 và `/login` 200; không merge local schema experiment.
3. Tiếp tục P03/P04 theo thứ tự: customer edit/detail, appointment local, sale/ledger local; sau mỗi mốc chạy build/test và cập nhật checkpoint.


## Deploy checkpoint — 2026-08-26 14:20 GMT+7

Clinic Windows đã nhận `origin/master` tại `0f07a8e5c3656914e93b577c3d267b98f96b3158`. Lần chạy `windows\\Sua-Loi.bat` hardened đã đi qua checkout, Docker build, recreate app, migration và báo `DA XONG`; bằng chứng tóm tắt lưu tại `checks/workspace-core-deploy-20260826.md`.

Runtime hậu kiểm: app `running`, DB `running/healthy`, `/login` HTTP 200; `docker compose exec -T app npx prisma migrate status` trả `60 migrations found` và `Database schema is up to date!`. Source clinic có route Customer và migration `20260826110000_workspace_core_modules`. Local QA state/worktrees còn được giữ ngoài commit; tracked patch cũ đã nằm trong stash, không tự động pop.

Updater issue đã được sửa và kiểm chứng: untracked path xung đột incoming tracked migration trước đây làm checkout fail; bản `0f07a8e` chuyển riêng các path xung đột ra backup ngoài repo, không xóa untracked/ignored, sau đó build thành công.

Chưa authenticated browser walkthrough vì owner chưa thực hiện bước đăng nhập. Chưa được tuyên bố toàn bộ Dự án hoàn chỉnh: Customer mới là foundation create/list; Appointment/Sales/Ledger/Finance/Payroll/layout/Global console/proposal workflow vẫn mở.


## Project operations checkpoint — 2026-08-26 18:30 GMT+7

Đã thêm module Doanh số project-local: `createWorkspaceSaleAction` xác minh project/customer, giới hạn số tiền và điều kiện PAID, ghi audit `ZWorkspaceSale`; trang `/du-an/[projectId]/doanh-so` tổng hợp tổng giá trị/đã thu và liệt kê giao dịch theo projectId. Registry thêm key `sales` và route local; Finance ledger vẫn chưa mở.

Đã thêm/hoàn chỉnh Lịch hẹn project-local ở commit `c4cb1fa`: create, assignee/customer cùng project, conflict trong khoảng ±30 phút và cập nhật trạng thái có audit. Build sandbox sau đó pass với các route `/lich-hen` và `/doanh-so`.

Bằng chứng code hiện tại: `prisma generate`, direct `tsc --noEmit`, governance tests **11/11**, `next build` pass. Chưa deploy commit Doanh số mới lên clinic; cần commit/push rồi chạy `Sua-Loi.bat`. Doanh số hiện chưa phải ledger/đối soát immutable đầy đủ và chưa có period filter; Customer edit/consent/detail/history, Finance, Payroll vẫn mở.


## 60-task coverage audit checkpoint — 2026-08-26

Theo phản hồi của người dùng, đã rà soát lại source-of-truth kế hoạch: kiểm tra thực tế cho kết quả `TASK_ROWS=60`, `TASK_UNIQUE=60`, đúng cấu trúc 10 phase × 6 task. Không task nào bị xóa hoặc thay thế bởi bản điều phối 6 phase. Bảng đối chiếu yêu cầu ban đầu → task → bằng chứng/giới hạn được lưu tại `checks/60-task-coverage-audit-20260826.md`.

Trạng thái kiểm kê: 6 `done`, 20 `review`, 34 `not_started`, không có `blocked`/`cancelled`. Các mục còn thiếu đã được ghi rõ: Customer edit/consent/detail/history, Finance/Ledger, Payroll/Commission, layout version/rollback/drag-drop, Global console scale, AI configuration proposal apply, QA seed/walkthrough và final handoff. Runtime updater Doanh số vẫn có process đang chạy; không khởi chạy chồng lấn và sẽ hậu kiểm sau khi process kết thúc.


## Config version foundation checkpoint — 2026-08-26

Đã thêm `ZWorkspaceConfigKind`, `ZWorkspaceConfigStatus` và model `ZWorkspaceConfigVersion` với `projectId`, version unique theo project/kind, effective time, JSON config, creator/approver và status draft/active/superseded/rolled-back. Migration additive là `20260826120000_workspace_config_versions`; Prisma validate/generate và direct TypeScript pass. Task P03-T02 được chuyển sang `review` vì nền schema đã có nhưng action preview/activation/rollback và UI chưa triển khai.


## Config version UI checkpoint — 2026-08-26

`updateProjectModulesAction` hiện tạo version MODULES mới trong transaction, supersede version ACTIVE trước, cập nhật `ZProject.enabledFeatures` để tương thích các loader hiện hữu và ghi audit kèm `configVersion`. Dự án mới tạo version MODULES 1 ACTIVE cùng lúc tạo project/member. Dashboard hiển thị 5 version gần nhất theo project.

Sandbox verification sau thay đổi: Prisma generate pass, TypeScript pass, governance test **11/11**, Next production build pass và route list không lỗi. P03-T02 vẫn `review`: chưa có preview/rollback action và UI dành riêng cho rollback; không coi manual Admin save là full approval workflow.


## Updater reliability checkpoint — 2026-08-26

Phản hồi của người dùng về việc không để browser/tab/process treo đã được ghi vào quy tắc vận hành của kế hoạch. Updater `windows/Sua-Loi.ps1` được harden thêm: build Docker dùng cache an toàn theo mặc định để giảm thời gian và phụ thuộc mạng; có thể chủ động đặt `ZENITH_FORCE_NO_CACHE=true` khi thật sự cần rebuild toàn bộ. Vẫn giữ `COMPOSE_BAKE=false`, redirect log, kiểm tra exit code, không `git clean`, không xóa volume/database.

Bản hardening đã qua `git diff --check` và push master tại `90f6bef`. Lần triển khai Doanh số trước đó bị dừng vì no-cache build đứng ở base-image apt; app/db clinic vẫn running/healthy và `/login` 200. Commit Doanh số và config-version vẫn cần một lần updater thành công để ghi runtime evidence.


## Plan cursor correction checkpoint — 2026-08-26

Người dùng phát hiện con trỏ điều phối hiển thị phase 10 dễ bị hiểu là `10/10` đã xong. Nguyên nhân là em tạm chuyển cursor lên phase 10 để xử lý blocker updater, không phải do 10 phase hoặc 60 task đã hoàn thành. Đã sửa lại cursor về phase 3 (Project-local schema và lifecycle/config version). Nguồn sự thật vẫn là bảng 60 task với trạng thái từng mã; hiện không được đánh dấu complete giả.

Quy tắc mới: không chuyển cursor phase chỉ để xử lý một blocker xuyên phase nếu việc đó có thể tạo tín hiệu hoàn thành sai; mọi báo cáo phải hiển thị riêng `phase cursor` và tổng trạng thái task.


## Sua-Loi wrapper diagnosis checkpoint — 2026-08-26

Nguyên nhân chính của hiện tượng cửa sổ đen khi agent gọi updater là cách khởi chạy nền/redirect làm mất trạng thái và một run có thể để `com.docker.build.exe` tách khỏi wrapper. `Sua-Loi.bat` đã được viết lại để hiện `[0/4]`, in thư mục/script đang chạy, kiểm tra `Sua-Loi.ps1` và PowerShell, ghi `Sua-Loi-launch.log`, hiển thị exit code và giữ cửa sổ ở cuối để người dùng đọc lỗi. Bản wrapper đã push tại `f9cddb8`.

Run trực tiếp tiếp theo đã phát hiện Docker Desktop Linux engine không còn phản hồi sau khi orphan build bị dừng; app/db trước đó vẫn healthy, nhưng các lần kiểm tra sau trả `/login=000` và pipe Docker chưa mở. Không được tuyên bố deploy config/sales thành công. Cần để Docker Desktop tự hồi phục hoặc owner mở lại Docker Desktop trước khi chạy updater tiếp; không xóa volume, không reset DB, không mở browser treo.


## Runtime deploy rerun checkpoint — 2026-08-26

Sau khi owner xác nhận Docker Running, updater đã được chạy một lần duy nhất. Docker engine phản hồi `29.7.2`; checkout clinic fetch master tới `7ecb61a`. Build cache-safe hoàn tất với Next `Compiled successfully`, TypeScript và Prisma generate pass. App log ghi migration `20260826120000_workspace_config_versions` applied và `All migrations have been successfully applied.` Hậu kiểm DB có 68 migration rows, migration mới nhất đúng tên trên; app running, DB healthy, `/login=200`. Evidence chi tiết: `checks/workspace-config-deploy-20260826-rerun.md`.

Giới hạn: sidecar timeout trong quá trình theo dõi nên chưa thu trực tiếp dòng cuối `DA XONG`/exit code wrapper. Vì vậy runtime đã được xác minh nhận bản build/migration, nhưng chưa đánh dấu P10-T02 `done` chỉ dựa trên evidence này.


## Audited module rollback checkpoint — 2026-08-26

Đã thêm action `rollbackProjectModulesAction` và UI `V2ModuleRollbackForm`. Luồng chỉ dành cho Admin, bắt buộc chọn version và nhập `ROLLBACK`; transaction tạo version ACTIVE mới từ config cũ, supersede bản ACTIVE hiện tại, cập nhật enabledFeatures tương thích, ghi `V2_PROJECT_MODULES_ROLLED_BACK` audit và không xóa lịch sử/dữ liệu module. TypeScript pass, governance test 11/11, Next production build pass. Commit đã push `b856e73`.

P03-T02 vẫn ở `review`: schema/version history, save action, audit, preview/rollback UI đã có; chưa chạy authenticated browser walkthrough hoặc runtime apply rollback trên clinic, nên chưa đánh dấu done.


## Ledger foundation checkpoint — 2026-08-26

Đã thêm enum `ZWorkspaceLedgerDirection`/`ZWorkspaceLedgerStatus`, model `ZWorkspaceLedgerEntry` với projectId bắt buộc, sale link cùng project, source/category/amount/occurredAt, void metadata, indexes và migration additive `20260826130000_workspace_ledger_entries`. Mở rộng rollback SQL isolation cho Customer/Appointment/Sale/Ledger hai project; cập nhật đặc tả không tuyên bố Finance/Payroll/UI ledger hoàn tất. Prisma validate/generate, TypeScript, governance 11/11 và Next production build pass. Commit push master: `7e19486`.


## Project-local finance ledger UI checkpoint — 2026-08-26

Đã thêm route `/du-an/[projectId]/tai-chinh`, form tạo ledger, liên kết sale cùng project, aggregate thu/chi và Admin void không xóa lịch sử. Module `finance` đã chuyển available với route local; module payroll vẫn blocked/planned. P05-T01 chuyển `review`; P05-T02–T06 vẫn chưa hoàn tất. Prisma generate, TypeScript, governance 11/11 và Next production build pass; route xuất hiện trong build. Commit code/spec/plan push master: `a30bbf5`.

Lưu ý runtime: clinic đã deploy tới migration config version ở run trước; commit `a30bbf5` có module ledger UI mới và migration ledger `20260826130000_workspace_ledger_entries`, cần một lần updater thành công kế tiếp trước khi tuyên bố route này có trên clinic.


## Payment reconciliation foundation checkpoint — 2026-08-26

Đã thêm `ZWorkspacePaymentReconciliation` và enum `ZWorkspaceReconciliationStatus` với `paymentRef`, amount, match status, link sale/ledger, matcher và project indexes; migration additive `20260826140000_workspace_payment_reconciliation`. P05-T02 chuyển `review` vì đã có schema foundation; match/exception action/UI và authenticated test còn mở. Prisma generate, TypeScript, governance 11/11 và Next build pass. Commit code/plan/spec push master: `992b178`.


## Payment reconciliation workflow checkpoint — 2026-08-26

Đã thêm workflow project-local: ghi payment reference ở `UNMATCHED`, liên kết optional tới Sale/Ledger cùng project, Admin xác nhận `MATCHED` bằng nhập `MATCH`, mọi thay đổi có audit và không đọc Payment legacy. Trang Tài chính đã hiển thị danh sách reconciliation và form match. TypeScript, governance 11/11 và Next build pass; commit code push master `ac832e2`. P05-T02 vẫn `review` cho đến khi migration/runtime/authenticated walkthrough được kiểm chứng trên clinic.


## Mechanism draft/activation checkpoint — 2026-08-26

Đã thêm action/UI tạo cơ chế project-local ở DRAFT từ JSON ruleSpec và Admin activate sau preview bằng xác nhận `ACTIVATE`; version ACTIVE cũ được retire, approvedBy/approvedAt/effective time và audit được ghi. Trang `/du-an/[projectId]/co-che` không chạm mechanism Nội Bộ. TypeScript, governance 11/11 và Next build pass; commit code push master `655f96f`. P05-T03 vẫn `review`/chưa hoàn tất vì chưa có rule test runner, proposal diff và runtime authenticated walkthrough; Payroll chưa được nối vào mechanism.


## Payroll snapshot foundation checkpoint — 2026-08-26

Đã thêm `ZWorkspacePayrollRun` và `ZWorkspacePayrollLine` project-local, migration additive `20260826150000_workspace_payroll_runs`, gồm kỳ lương, status Draft/Preview/Approved/Finalized/Voided, mechanismVersion link, mechanism snapshot, line snapshot, gross/commission/deduction/net và project/member indexes. Prisma validate/generate, TypeScript, governance 11/11 và Next build pass. P05-T04 chuyển `review`; action/UI tạo run, finalize/void, commission calculation và sensitive role policy còn mở. Commit code/plan/spec push master `5817c3e`.


## Payroll DRAFT action/UI checkpoint — 2026-08-26

Đã thêm route `/du-an/[projectId]/luong` và Admin form/action tạo PayrollRun DRAFT: bắt buộc mechanism version ACTIVE thuộc project, snapshot ruleSpec, kỳ start/end, tạo line snapshot cho active project members với zero pending amounts, ghi audit; payroll route chưa bật trong registry menu vì finalize/void/calculation/policy chưa hoàn tất. TypeScript, governance 11/11 và Next build pass; commit code push master `8e28d84`. P05-T04 vẫn `review`.


## Batch runtime deploy checkpoint — 2026-08-26

Sau khi Docker Running, đã chạy đúng một lần `Sua-Loi.bat` cache-safe. Wrapper mới ghi trực tiếp `END exit=0` lúc 21:39:49; clinic checkout ở `5d38fc0`. DB có 71 migrations; năm migration gần nhất gồm `20260826110000_workspace_core_modules`, `20260826120000_workspace_config_versions`, `20260826130000_workspace_ledger_entries`, `20260826140000_workspace_payment_reconciliation`, `20260826150000_workspace_payroll_runs`. App log ghi ba migration batch apply, `All migrations have been successfully applied.`, `Ready in 468ms`; app running, db healthy, `/login=200`. Evidence: `checks/payroll-batch-deploy-20260826.md`.

Đã deploy ledger/reconciliation UI và PayrollRun DRAFT route/action; Payroll menu vẫn blocked, finalize/void/calculation/commission policy chưa hoàn tất. Không đánh dấu toàn bộ Finance/Payroll done chỉ vì updater exit 0.


## Speed strategy checkpoint — 2026-08-26

Theo yêu cầu ưu tiên tốc độ có kiểm soát: thực thi code/test chủ yếu trên sandbox; gom migration/UI thành release candidate; chỉ chạy `Sua-Loi.bat` một lần sau khi sandbox Prisma/TypeScript/governance/Next build pass. Không dùng browser hoặc updater nền để tạo cảm giác đang làm; mỗi deploy phải có exit code, migration, health và HTTP evidence. Current phase remains P05 Finance/Payroll; clinic đã nhận batch tới SHA `5d38fc0`, còn code mới sau đó sẽ gom thành batch kế tiếp.

## Payroll governance batch — 2026-08-26

- Sandbox implementation committed/pushed as `83effb4` (`feat: add payroll preview approval governance`).
- Added project-scoped Admin `DRAFT -> PREVIEW` with explicit `PREVIEW` confirmation and audited `PREVIEW -> APPROVED` with explicit `APPROVE`, line snapshot/non-negative amount checks.
- UI deliberately states finalize/chi trả are not available; no legacy PayrollEntry/Payment/CaseRecord access.
- Evidence: `checks/payroll-governance-sandbox-20260826.md`.
- Verification passed: `tsc --noEmit`, AI governance Vitest 11/11, Next production build.
- Plan corrected: P03-T06 and P05-T03 are `review`; P05-T04 remains `review` with explicit missing commission calculation/finalize/void/sensitive policy/runtime gaps.
- Next implementation focus: complete project-local commission calculation preview from immutable mechanism snapshot, then add tested approval/finalize/void policy without enabling Payroll module until quality gates pass.

## Payroll calculation preview batch — 2026-08-26

- Sandbox implementation committed/pushed as `fb2084a` (`feat: add project payroll calculation preview`).
- Added an explicit project-local calculation contract: `SALE_PAID` or `INCOME_LEDGER`, integer `rateBps` 0..10000, deterministic equal allocation across PayrollLine user snapshots.
- `CALCULATE` is Admin-only, requires a typed confirmation, operates only on a project-local DRAFT run, uses only local sale/ledger rows in the period, stores calculation metadata in line snapshot and aggregate audit, and never reads legacy payroll/payment/case tables.
- Final verification: targeted Vitest 14/14, direct TypeScript pass, Next production build pass. Evidence: `checks/payroll-calculation-sandbox-20260826.md`.
- One initial Prisma JSON typing failure was corrected before the final pass.
- Still not done: runtime/QA DB proof, two-person sensitive payroll policy, finalize/void/payout, richer mechanism rule test/diff, and authenticated walkthrough. Payroll remains unavailable in module registry; do not run Windows updater for this sandbox batch yet.

## Payroll sensitive display policy — 2026-08-26

- Commit `b779de8` pushed: project Payroll page now masks gross/commission/net totals for non-Admin users; Admin alone sees sensitive totals and governance actions remain Admin-only.
- Sandbox targeted tests 14/14, TypeScript, and Next build pass after the change.
- This is a role-display safeguard, not the final two-person approval policy. Finalize/void/payout and runtime/QA proof remain open.

## Payroll two-person governance batch — 2026-08-26

- Commit `90c3a15` pushed. Added additive migration `20260826160000_payroll_two_person_governance` with second approver, finalizer, voider, timestamps and void reason on project-local PayrollRun.
- Governance sequence now enforces `CALCULATE -> PREVIEW -> APPROVE -> APPROVE_SECOND by a different Admin -> FINALIZE`; VOID of APPROVED/FINALIZED requires prior two-person approval and a reason. All changes are audited, no rows are deleted, and finalize does not create payout or touch Internal data.
- Non-Admin payroll totals are masked. PREVIEW requires calculation snapshot. Prisma validate/generate, targeted Vitest 14/14, direct TypeScript and Next build pass.
- P05-T05 moved to `review`; P05-T04 remains `review`. Do not deploy yet: migration/runtime QA, two-Admin authenticated walkthrough, isolated DB integration tests and payout/accounting integration remain open. Payroll registry stays unavailable.

## Payroll isolation SQL checkpoint — 2026-08-26

- Commit `3d06313` pushed. `checks/test-workspace-core-isolation.sql` now includes rollback-only synthetic checks for mechanism version, PayrollRun and PayrollLine project scope, while still asserting legacy Customer/Appointment counts do not change.
- This SQL has not been run against clinic. It must run only against isolated QA or a deliberate transaction after migration `20260826160000_payroll_two_person_governance` is applied.

## Isolation snapshot correction — 2026-08-26

- Commit `2505b7d` pushed. Synthetic PayrollRun/Line JSON snapshots in the rollback-only isolation SQL now bind to the generated project ID using `jsonb_build_object`, avoiding placeholder context in QA evidence.
- No QA/clinic database was touched; SQL remains pending isolated QA execution after the new migration.

## Customer lifecycle batch — 2026-08-26

- Commit `54149c4` pushed. Added additive project-local consent/soft-delete fields and migration `20260826170000_workspace_customer_consent_lifecycle`.
- Added scoped Customer edit, consent record, archive actions with audit; added detail route with project-local appointments, sales and audit history; list links to detail.
- P04-T02 moved to `review`, not done. Sandbox Prisma validate/generate, targeted Vitest 14/14, TypeScript and Next build pass. Runtime authenticated walkthrough and isolated DB execution remain open; no clinic/browser touched.

## Sales period filter batch — 2026-08-26

- Commit `644207d` pushed. Project Sales now supports URL-scoped from/to period filtering; aggregate cards and table use the same project-local period query, with reset control.
- Sandbox TypeScript, targeted Vitest 14/14 and Next build pass. P04-T05 remains review because runtime/authenticated regression is open. Clinic has not received this batch.

## Full regression checkpoint — 2026-08-26

- Full Vitest regression passed: 76 files / 406 tests, 0 failures. Evidence: `checks/full-vitest-regression-20260826.md`.
- Evidence commit `1961316` pushed; local/remote master matched and tree was clean after commit.
- This strengthens the sandbox release candidate but does not change production status: migrations/runtime/QA SQL/authenticated walkthrough remain pending, so no Windows updater was started.

## Documentation alignment checkpoint — 2026-08-26

- Commit `f91ed43` pushed. Source-of-truth plan and `WORKSPACE-V3-REAL-PROJECT.md` now accurately state that Payroll calculation preview and two-person finalize/void exist, while payout/accounting integration, isolated DB proof and authenticated runtime remain open.

## Payroll policy helper checkpoint — 2026-08-26

- Commit `812a42b` pushed. Extracted pure two-person approval/void status policy and added unit tests; server actions now consume the helper.
- Targeted governance/calculation/policy tests passed 16/16; TypeScript and Next build passed. This improves P05-T06 evidence but does not replace DB isolation or runtime role tests.

## QA environment checkpoint — 2026-08-26

Sandbox verification confirmed `docker` is unavailable, so no isolated PostgreSQL runtime/migration/SQL test was attempted here. Unit tests, Prisma validation/generate, TypeScript and Next build remain valid sandbox evidence only. QA DB/runtime must be handled later in the isolated QA environment, never against clinic.

## Mechanism rule test runner checkpoint — 2026-08-26

- Commit `ffeb725` pushed. Mechanism DRAFT now stores bounded testCases; Admin can run explicit `TEST_RULE` against a project-local version, receiving audited PASS/FAIL aggregate. Activation remains a separate explicit `ACTIVATE` action.
- Targeted gate passed: 19/19 tests, TypeScript and Next build. One parser narrowing issue was fixed before final pass. P05-T03 remains review pending isolated DB/runtime proof; no clinic updater/browser used.

## Full regression after mechanism tests — 2026-08-26

- Full Vitest rerun passed: 78 files / 411 tests, 0 failures, 2.41 seconds. Evidence refreshed at `checks/full-vitest-regression-20260826.md`.
- Mechanism rule-test runner is included in the suite. This is still sandbox-only evidence; no migration/runtime/clinic execution was performed.

## P05 test coverage alignment — 2026-08-26

- Plan P05-T06 moved to `review`: pure Payroll calculation/policy/Mechanism rule tests and rollback-only SQL now exist, but isolated DB and authenticated role runtime evidence remain required.

## Workspace navigation boundary checkpoint — 2026-08-26

- Commit `b1c4b60` pushed. AppShell now consumes a pure workspace navigation helper; project menu excludes legacy Internal routes, Manager lacks global project-management link, and `__GLOBAL__` cannot become an active project.
- Targeted navigation/mechanism/payroll/AI tests passed 22/22; TypeScript and Next build passed. No browser/database runtime used. P06-T02/T03 are strengthened but P06-T05/T06 authenticated mobile/runtime smoke remain open.

## Final sandbox regression after AppShell refactor — 2026-08-26

- Full Vitest rerun passed: 79 files / 414 tests, 0 failures, 2.37 seconds. Evidence refreshed at `checks/full-vitest-regression-20260826.md`.
- Navigation boundary tests are included. This remains sandbox-only; migration/runtime/QA/authenticated walkthrough are still open and no clinic updater was run.

## Reconciliation exception batch — 2026-08-26

- Commit `75c7b5d` pushed. Project-local Finance now supports explicit Admin `UNMATCHED -> EXCEPTION` with reason and audit, alongside separate MATCH flow; no legacy Payment access.
- Prisma validate/generate, targeted tests 22/22, TypeScript and Next build passed. P05-T02 remains review pending isolated DB and authenticated runtime proof.

## Global project console checkpoint — 2026-08-26

- Commit `8b1f5ec` pushed. `/du-an` now has bounded 50-row cursor pagination, code/name search, project-local aggregate counts, Admin all-project scope and Manager active-membership scope.
- Prisma/TypeScript/Next and targeted tests 22/22 passed. P07-T05 remains review pending authenticated runtime, synthetic scale-data test and global aggregate verification.

## Global console plan alignment — 2026-08-26

- P07-T04 and P07-T05 moved from `not_started` to `review` because scoped Global Admin console, per-project aggregates, bounded search and 50-row cursor pagination now exist. Synthetic scale/runtime and authenticated Manager denial remain open.

## Config proposal governance checkpoint — 2026-08-26

- Commit `462502a` pushed. Added project-local config proposal schema/migration and Admin-only DRAFT → APPROVE → APPLY/REJECT workflow with before/after preview, explicit PROJECT target, L5 fail-closed, rollback version link and audit.
- Prisma validate/generate, TypeScript, Next build and proposal/navigation/mechanism/payroll/AI targeted tests passed 24/24. This is foundation evidence only; AI-originated proposals, isolated DB and authenticated runtime approval/apply remain open. No clinic updater/browser used.

## AI project proposal governance checkpoint — 2026-08-26

- Commit `1d410a5` pushed. AI dispatcher now recognizes `propose_workspace_config` as Admin draft-only capability; policy tests explicit Global project target, Manager denial and no direct APPLY.
- Config proposal schema/UI/actions remain project-local with separate DRAFT/APPROVE/APPLY/REJECT, before/after, risk, rollback and audit. Targeted gate passed 25/25 plus TypeScript/Next build.
- P08-T01/T02/T03/T04 remain open/not done until real AI tool invocation, isolated DB and authenticated workflow evidence exist. No clinic updater/browser used.

## Full regression after AI proposal governance — 2026-08-26

- Full Vitest rerun passed: 80 files / 417 tests, 0 failures, 2.37 seconds. Evidence refreshed at `checks/full-vitest-regression-20260826.md`.
- AI proposal policy and workspace boundary tests are included. No database/runtime/clinic execution was performed.

## Phase 08 plan alignment — 2026-08-26

- Plan cursor moved to Phase 08 after sandbox work reached AI/config proposal foundation.
- P08-T03 and P08-T04 moved to `review`: project-local proposal schema and explicit DRAFT → APPROVE → APPLY/REJECT/audit now exist; P08-T01/T02/T06 and real AI-originated proposal/runtime QA remain open.

## AI context plan alignment — 2026-08-26

- P08-T01, P08-T02 and P08-T06 moved from `not_started` to `review`: existing `/tro-ly` selector supports INTERNAL/PROJECT/GLOBAL with Admin-only `__GLOBAL__`, server policy requires explicit projectId outside aggregate, and regression covers scope boundaries. Multi-target integration, prompt isolation and authenticated runtime remain open.

## Global console scope helper checkpoint — 2026-08-26

- Commit `56e0bfc` pushed. `/du-an` now uses a unit-tested `projectConsoleWhere` and shared page size 50; Admin all-project and Manager active-membership query scopes are explicit.
- Targeted gate passed 27/27 plus TypeScript and Next build. P07-T04/T05 remain `review`; synthetic 1000-project scale, authenticated role denial and live aggregate verification remain open.

## Full regression after Global console scope helper — 2026-08-26

- Full Vitest rerun passed: 81 files / 419 tests, 0 failures, 2.41 seconds. Evidence refreshed at `checks/full-vitest-regression-20260826.md`.
- The suite includes Global console role scope and AI proposal governance. No database/runtime/clinic execution was performed.

## Workspace layout policy checkpoint — 2026-08-26

- Commit `61c29e6` pushed. Added pure validator for unique project module order; unknown, duplicate, disabled and planned modules are rejected. Payroll remains unavailable in registry.
- Layout policy targeted gate passed 29/29 with TypeScript and Next build. Drag/drop, keyboard fallback, layout version save/preview/rollback UI and runtime remain open; P07-T01/T02/T03/T06 are not done.

## Workspace layout editor checkpoint — 2026-08-26

- Commit `39904c1` pushed. Admin-only project dashboard layout editor now supports native drag/drop and Move Up/Down keyboard fallback; it creates a LAYOUT DRAFT proposal and does not apply directly.
- Targeted gate passed 29/29 with TypeScript and Next build. Runtime accessibility, persisted LAYOUT apply/rollback and isolated DB remain open; no clinic updater/browser used.

## Phase 07 layout plan alignment — 2026-08-26

- P07-T01/T02/T03 moved from `not_started` to `review`: LAYOUT config/proposal foundation, Admin drag/drop plus keyboard fallback, and invalid/duplicate/planned module validation now exist. Persisted layout rollback, runtime accessibility and synthetic scale tests remain open.

## Global console scoped totals checkpoint — 2026-08-26

- Commit `0bd18e2` pushed. `/du-an` now shows total matching projects from a bounded scoped count query alongside the 50-row cursor page and per-project aggregates.
- Targeted policy/layout/AI/mechanism/payroll gate passed 29/29 with TypeScript and Next build. P07-T04/T05 remain review pending synthetic scale and authenticated runtime.

## Global console synthetic pagination checkpoint — 2026-08-26

- Commit `aee03dd` pushed. Global console now uses a pure cursor helper; synthetic 1,001-row walk verifies max 50 rows/page, no duplicate IDs and no missing IDs.
- Targeted gate passed 30/30 with TypeScript and Next build. P07-T05 remains review pending PostgreSQL query-plan/scale runtime and authenticated role evidence; no clinic updater/browser used.
