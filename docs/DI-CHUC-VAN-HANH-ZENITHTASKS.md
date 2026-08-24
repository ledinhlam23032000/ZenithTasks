# DI CHÚC VẬN HÀNH ZENITHTASKS

> **Dành cho người hoặc AI đến sau.** Nếu một ngày người xây dựng ban đầu không còn trực tiếp mở repository này, đây là lời nhắc cuối cùng về điều cần giữ gìn: ZenithTasks không chỉ là một ứng dụng web, mà là nơi lưu workflow, tài chính, hồ sơ điều trị và niềm tin của một phòng khám.

## Lời mở đầu của người bàn giao

Nếu bạn đang đọc tài liệu này, hãy bắt đầu bằng sự bình tĩnh. Đừng coi một issue, một yêu cầu vội, một lỗi hiển thị hoặc một câu lệnh của AI là lý do để đụng ngay vào database production. Mỗi thay đổi có thể ảnh hưởng đến khách hàng, bác sĩ, điều dưỡng, lễ tân, tư vấn viên, kế toán và lịch sử tiền bạc của phòng khám. **Làm đúng và có thể kiểm chứng quan trọng hơn làm nhanh.**

Hãy giữ tinh thần clinic-first. Người dùng cần một hệ thống rõ ràng để tiếp nhận khách, xếp lịch, tư vấn, điều trị, thanh toán, thu–chi, chăm sóc và báo cáo. V2 và AI được xây để làm các quy trình tương lai linh hoạt hơn, không được phép biến công việc hằng ngày thành một mê cung kỹ thuật.

## 1. Bốn lời thề không được phá vỡ

| Lời thề | Ý nghĩa vận hành |
|---|---|
| **Không làm mất dữ liệu** | Không `migrate reset`, không `db push` tùy tiện, không `docker compose down -v`, không xóa volume, uploads, audit hoặc lịch sử tài chính. Backup trước mọi thay đổi có khả năng chạm production. |
| **Không nhầm QA với clinic** | QA DeepSeek dùng database `zenith_v2_qa`, container `zenith_v2_qa_devsrc`, port `3300`; clinic dùng stack production-like port `3000`. Không dùng key, account hoặc command QA cho clinic. |
| **Không biến bản nháp thành sự thật** | Cơ chế do AI gợi ý phải có clarification, evidence, preview và trạng thái draft; chưa activation thì chưa được tính vào lương, hoa hồng, settlement hoặc dữ liệu thật. |
| **Không vượt quyền con người** | Sensitive read cần purpose/scope phù hợp; L5 như xóa dữ liệu, chấm dứt nhân sự, đổi quyền và deploy bị chặn vì two-person approval chưa hoàn chỉnh. |

## 2. Thứ tự nguồn sự thật

| Thứ tự | Nguồn | Cách kiểm chứng |
|---:|---|---|
| 1 | Mã nguồn và migration trên `master` | `git fetch origin`; đối chiếu `git rev-parse HEAD` với `git ls-remote origin refs/heads/master`. |
| 2 | Database/container đang được kiểm tra | Xác nhận container, `DATABASE_URL`, migration status và port trước command. |
| 3 | Test, server action và audit record | Ưu tiên hành vi server-side; HTTP 200 của meta redirect không phải bằng chứng authorization. |
| 4 | `VERSION.md`, `CHANGELOG.md`, `docs/INDEX.md` | Dùng để hiểu release/lịch sử và phải sửa nếu khác source. |
| 5 | Hồ sơ handoff và tài liệu này | Dùng làm bản đồ tiếp quản, runbook và các giới hạn đã cam kết. |

> **Quy tắc dừng:** Nếu không xác định được mình đang nói chuyện với database nào, role nào, branch nào hoặc container nào, hãy dừng thao tác ghi và chỉ làm kiểm tra đọc.

## 3. Nửa giờ đầu khi tiếp quản

### Phút 0–5: nhận diện đúng repository

Đứng tại root `ZenithTasks`, kiểm tra branch, remote và status. Không tự động `git clean`, không xóa `worktrees/`, không stage toàn bộ repository chỉ vì muốn working tree sạch. Các thay đổi local của owner phải được giữ lại hoặc báo rõ.

```text
git status --short
git rev-parse HEAD
git ls-remote origin refs/heads/master
git log -5 --oneline --decorate
```

### Phút 5–10: đọc bản đồ dự án

Đọc [`VERSION.md`](../VERSION.md), [`CHANGELOG.md`](../CHANGELOG.md), [`docs/INDEX.md`](INDEX.md), [`docs/PROJECT-HANDOFF-2026-08-24.md`](PROJECT-HANDOFF-2026-08-24.md), [`web/AGENTS.md`](../web/AGENTS.md) và [`web/BAN-GIAO.md`](../web/BAN-GIAO.md). Khi sửa AI, đọc thêm [`AI-ADMIN-GATEWAY.md`](AI-ADMIN-GATEWAY.md), [`AI-EXECUTIVE-GOVERNANCE-V3.md`](AI-EXECUTIVE-GOVERNANCE-V3.md) và [`AI-TRAINING-STUDIO-SETUP.md`](AI-TRAINING-STUDIO-SETUP.md).

### Phút 10–20: chọn đúng môi trường

Kiểm thử V2, AI hoặc Training Studio thì dùng `windows/Cau-Hinh-AI-QA.bat`, mở `http://localhost:3300/login`, rồi dọn bằng `windows/Tat-AI-QA.bat`. Cập nhật máy clinic thì backup trước và dùng `windows/Sua-Loi.bat` cho `http://127.0.0.1:3000`. Chẩn đoán read-only thì dùng `windows/Xem-Loi.bat`; công cụ này tự thu log, tự phân loại và mở báo cáo UTF-8.

Không được suy ra rằng một link local là public demo. Port `3300` chỉ tồn tại khi QA container đang chạy trên máy đó; hostname public chỉ có ý nghĩa khi máy clinic và Cloudflare Tunnel đang hoạt động.

### Phút 20–30: viết kế hoạch trước khi sửa

Ghi rõ mục tiêu, file sẽ thay đổi, database có thể bị chạm, migration cần thiết, test phải chạy, rollback và người phê duyệt. Nếu thay đổi tiền, lương, hồ sơ y tế, role, approval hoặc webhook, kế hoạch phải có regression test và kiểm tra server-side.

## 4. Bản đồ hệ thống cần nhớ

| Lớp | Thành phần | Không được quên |
|---|---|---|
| Clinic core | Khách, lịch hẹn, hồ sơ điều trị, tư vấn, dịch vụ, vật tư, thanh toán, thu–chi, kế toán, nhân sự, chăm sóc, cổng khách | Đây là workflow ưu tiên; AI/V2 không được phá dữ liệu cũ hoặc làm UI rối hơn. |
| Data layer | Prisma schema, migrations, PostgreSQL, Docker volume, uploads và runtime secrets | Migration additive; không reset volume; production status phải kiểm tra trên máy thật. |
| Operating Framework V2 | Project, organization, position, membership, assignment, mechanism definition/version, simulation | Generic cho nhiều dự án; mechanism draft không tự đi vào lương/settlement. |
| AI dispatcher | Planner, clarification, tool whitelist, bounded reads, preview, approval, audit, conversation | Model không được tự suy ra quyền; server-side policy là cửa cuối. |
| AI clarification | A/B/C/D, impact, missing fields, evidence và draft inactive | Sau khi tạo draft, clarification cũ phải bị supersede; không dùng lựa chọn stale. |
| Governance | L0–L5, role capability, project scope, sensitive-read purpose/confirmation | L5 nguy hiểm hiện dừng an toàn; chưa có full two-person approval. |
| Training Studio | Feature flag, dashboard/counts, TESTING profile, demo dataset/prompt/examples | Chỉ là MVP; chưa có full CRUD, evaluation runner, red-team, release/publish/rollback. |

## 5. Cách làm việc với AI nội bộ

AI được khuyến khích hỏi lại thay vì đoán. Với cơ chế hoa hồng, chiết khấu, phân bổ doanh thu hoặc revenue sharing, câu trả lời tốt phải đưa ra A/B/C/D dễ chọn, giải thích tác động, chỉ ra thông tin còn thiếu và nói rõ bản nháp chưa có hiệu lực.

Một lệnh ghi phải đi qua chuỗi: **nhận diện ý định → kiểm role/capability/scope → đọc bounded data → tạo preview → confirmation/approval → transaction → audit → trả kết quả có căn cứ**. Nếu thiếu một mắt xích, AI phải chuyển sang giải thích hoặc yêu cầu bổ sung, không tự nâng quyền.

Không đưa password, JWT, API key, browser profile, dữ liệu khách thật hoặc file `.env` vào prompt, log, issue, commit hay tài liệu. Credentials demo phải được tạo và lưu local; GitHub chỉ mô tả username convention và cách lấy credential an toàn.

## 6. QA và demo role

QA role convention là `admin1`, `manager1`, `telesale1`, `reception1`, `consultant1`, `doctor1`, `nurse1`, `care1`, `shareholder1` và `collaborator1`. Đây là username convention, không phải password công khai. Credentials đầy đủ chỉ ở `checks/qa-role-credentials.local.json` khi máy kiểm thử có file local bị ignore; bản clone mới không được giả định file đó tồn tại.

Trước khi đăng nhập QA, phải xác nhận URL đúng `3300`, database đúng `zenith_v2_qa` và container đúng `zenith_v2_qa_devsrc`. Sau test, chạy cleanup để xóa container/env chứa key. Nếu key từng xuất hiện trong chat, ảnh, log hoặc email, coi là đã lộ và revoke tại provider.

QA tối thiểu phải bao phủ A/B/C/D tiếng Việt UTF-8; chọn một phương án tạo draft inactive; sensitive read có purpose/masking/audit; role không đủ quyền bị server-side block; yêu cầu L5 không thực thi; feature flag off không truy vấn bảng V2/Training; Training Studio chỉ hiện MVP.

## 7. Quy trình thay đổi và phát hành

Trước khi sửa, tạo plan, xác định phạm vi, tìm `AGENTS.md`, đọc migration/schema và chuẩn bị backup/rollback. Trong khi sửa, ưu tiên pure helper và test deterministic cho rule engine, clarification và governance; UI phải làm rõ trạng thái draft/preview/blocked. Sau khi sửa, chạy Prisma validate/generate, TypeScript, test liên quan, production build khi thay source; launcher PowerShell phải qua parser.

`windows/Xem-Loi.bat` là chẩn đoán read-only, không migrate/restart/reset. Nó ghi báo cáo UTF-8 không BOM, thu `docker compose ps`, migration status và 150 dòng app log, sau đó tự in `OK/WARN/FAIL`. Console wrapper dùng ASCII an toàn để không phụ thuộc code page Windows.

Khi cập nhật clinic, backup database và `uploads`, rồi dùng `windows/Sua-Loi.bat`. Updater fetch `origin/master`, bảo vệ local change, build image, recreate app, chạy `prisma migrate deploy` và health-check `http://127.0.0.1:3000/login`. Nếu build/migration lỗi, dừng và đọc log; không tuyên bố đã phát hành chỉ vì container còn chạy.

Sau cập nhật, kiểm tra đăng nhập ADMIN, một hồ sơ điều trị, thanh toán, Thu–chi, Kế toán, Hệ thống, backup status và public hostname. Chỉ bật feature flag V2/Training sau khi migration đã kiểm tra, backup đã có và owner chấp thuận.

## 8. Bài học không tái phạm

Lỗi ngày 24/08/2026 cho thấy migration có thể hoàn toàn thành công trong khi báo cáo chẩn đoán vẫn làm owner hiểu nhầm. `Xem-Loi.bat` cũ lấy native output qua lớp mã hóa mặc định của Windows, khiến tiếng Việt/emoji trong Docker log biến thành `ΓÅ│`, `ß╗Ñ` và `≡ƒ`. Owner phải tự mở công cụ và dò nguyên nhân, trái với tiêu chí một lần bấm.

Từ sau sự cố, output native phải được redirect trực tiếp sau khi đặt code page UTF-8; báo cáo phải ghi UTF-8 không BOM; công cụ phải tự kiểm tra migration/app/QA và in `OK`, `WARN`, `FAIL`; cuối cùng phải nói rõ clinic port `3000` hay QA port `3300`. Console launcher chỉ dùng ASCII an toàn; chi tiết tiếng Việt nằm trong file báo cáo.

Không được kết luận “app hỏng” chỉ vì log hiển thị sai mã. Trước tiên kiểm tra exit code, `Database schema is up to date`, dấu hiệu `Ready`, container/database/port và thời điểm tạo container. Không để owner làm người trung gian thu thập bằng chứng nếu agent có thể tự chạy công cụ read-only trên máy được cấp quyền.

## 9. Các tình huống khẩn cấp

| Dấu hiệu | Hành động đầu tiên | Tuyệt đối không làm |
|---|---|---|
| Updater dừng khi stash | Giữ nguyên app/volume; xem status và log; xử lý artifact local rồi chạy lại | Không `git clean -fd`, không xóa worktree/profile, không reset database. |
| Build thất bại | Ghi nhận mã lỗi/log; giữ bản app cũ nếu còn healthy | Không xóa uploads hoặc khẳng định migration là nguyên nhân khi chưa có log. |
| Migration thất bại | Dừng smoke test; giữ log migration; kiểm tra trạng thái database | Không chạy reset, không sửa migration đã apply bằng tay. |
| Public 502 | Kiểm tra app `127.0.0.1:3000`, container, tunnel/origin và DNS theo từng lớp | Không đổi hostname hoặc đụng database chỉ vì lỗi tunnel. |
| AI sai quyền | Chặn thao tác, lưu audit/request, kiểm governance adapter và server action | Không mở quyền bằng cách sửa UI hoặc tin role model gửi lên. |
| Lộ credential | Revoke/rotate tại provider, cleanup env, ghi incident không chứa secret | Không commit key mới để “sửa nhanh”, không dán lại secret vào issue. |

## 10. Những điều chưa được tuyên bố

Không tuyên bố Training Studio đã là hệ thống đào tạo AI đầy đủ. Không tuyên bố L5 đã có hai người duyệt thật sự. Không tuyên bố AI có quyền tự đuổi nhân viên, tự deploy hoặc tự xóa dữ liệu. Không tuyên bố một migration production đã thành công nếu chưa có bằng chứng từ chính máy clinic. Không tuyên bố `localhost:3300` là link demo public. Không tuyên bố HTTP 200 của meta redirect là role authorization thành công.

Khi full evaluation, red-team, release/rollback và two-person approval được triển khai thật, phải cập nhật schema, test, audit, runbook, changelog và tài liệu này cùng một release.

## 11. Checklist định nghĩa “đã hoàn thành”

Một thay đổi chỉ hoàn thành khi người tiếp quản khác có thể trả lời được: thay đổi gì, ảnh hưởng ai, dữ liệu nào, quyền nào, migration nào, test nào, rollback thế nào, ai đã duyệt và cách kiểm tra sau phát hành. Nếu thiếu câu trả lời, trạng thái phải là **chưa hoàn thành** hoặc **deferred**.

| Câu hỏi | Bằng chứng cần có |
|---|---|
| Source đã đúng bản chính chưa? | HEAD và origin/master cùng SHA. |
| Dữ liệu có an toàn không? | Backup/checkpoint và không có reset/volume destructive. |
| Quyền có đúng không? | Server-side test theo role, không chỉ screenshot/UI. |
| AI có giải thích được không? | Preview, evidence, audit và response không phóng đại. |
| Diagnostic có một lần bấm không? | Xem-Loi.bat chạy không UAC thừa, báo cáo UTF-8 và tự phân loại. |
| QA có tái lập được không? | Launcher, URL/DB/container đúng và cleanup thành công. |
| Người sau có tiếp quản được không? | Link tài liệu, changelog, test command và giới hạn rõ ràng. |

## 12. Lời kết

Hãy xem mỗi commit như một trang trong sổ bàn giao cho người chưa từng gặp dự án. Viết đủ để họ không phải đoán, nhưng đừng viết điều chưa kiểm chứng. Bảo vệ dữ liệu clinic trước khi chứng minh sức mạnh công nghệ. Khi phải lựa chọn giữa bản vá nhanh và quy trình có backup, preview, approval, audit và test, hãy chọn quy trình có thể giải thích lại sau này.

ZenithTasks được xây để nhiều dự án và nhiều cơ chế có thể sống chung trong một khung vận hành, nhưng nền tảng đó chỉ có giá trị khi sự tin cậy được giữ nguyên. **Đừng làm hệ thống thông minh hơn bằng cách làm nó liều lĩnh hơn. Hãy làm nó rõ ràng hơn, có căn cứ hơn và dễ tiếp quản hơn.**

## Tài liệu tham chiếu nội bộ

1. [`README.md`](../README.md) — entry point và lệnh nhanh.
2. [`VERSION.md`](../VERSION.md) — release và nguồn sự thật cần đối chiếu bằng Git.
3. [`CHANGELOG.md`](../CHANGELOG.md) — lịch sử thay đổi.
4. [`docs/INDEX.md`](INDEX.md) — thứ tự đọc và bản đồ source.
5. [`docs/PROJECT-HANDOFF-2026-08-24.md`](PROJECT-HANDOFF-2026-08-24.md) — QA/demo handoff chi tiết.
6. [`web/BAN-GIAO.md`](../web/BAN-GIAO.md) — bàn giao kỹ thuật ứng dụng.
7. [`docs/OPERATIONS-RUNBOOK.md`](OPERATIONS-RUNBOOK.md) — vận hành, backup, migration và sự cố.
8. [`docs/AI-EXECUTIVE-GOVERNANCE-V3.md`](AI-EXECUTIVE-GOVERNANCE-V3.md) — policy L0–L5 và target architecture.
9. [`docs/AI-TRAINING-STUDIO-SETUP.md`](AI-TRAINING-STUDIO-SETUP.md) — Training Studio MVP.
