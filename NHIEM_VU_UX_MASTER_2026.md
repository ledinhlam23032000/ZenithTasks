# NHIỆM VỤ UX/NÂNG CẤP VẬN HÀNH — NGUỒN SỰ THẬT DUY NHẤT

> **Trạng thái tài liệu:** Đã duyệt toàn bộ trừ nhiệm vụ 11; nhiệm vụ 11 bị loại khỏi phạm vi triển khai.
>
> **Mục tiêu:** Giảm số bước thao tác, giảm nhập lại, giảm chuyển màn hình, giảm lỗi dữ liệu và tự động hóa các việc lặp lại trong ZenithTasks.
>
> **Nguyên tắc:** Chỉ triển khai nhiệm vụ đã được duyệt. Mỗi nhóm nhiệm vụ được làm trên nhánh riêng, kiểm thử đầy đủ, cập nhật trạng thái trong file này và tạo PR. Không tự merge vào `master` nếu chưa có xác nhận của chủ dự án.

## Cách duyệt và gọi nhiệm vụ

Chủ dự án có thể trả lời theo một trong các mẫu sau:

- `Duyệt toàn bộ danh mục.`
- `Duyệt nhiệm vụ 1–10.`
- `Duyệt 1–5, 8, 12 nhưng chưa duyệt 6–7.`
- `Làm nhiệm vụ 1–10.`
- `Dừng nhiệm vụ 4, đổi ưu tiên nhiệm vụ 9 lên trước.`

Khi nhận lệnh thực hiện, Manus phải đọc file này, đọc trạng thái dự án, kiểm tra phụ thuộc của từng nhiệm vụ, tạo nhánh triển khai, làm đúng phạm vi, chạy quality gate, cập nhật trạng thái và ghi lại bằng chứng. Nếu một nhiệm vụ làm phát sinh thay đổi nghiệp vụ hoặc migration ngoài mô tả, phải dừng ở `Cần chủ xác nhận` thay vì tự mở rộng phạm vi.

## Trạng thái nhiệm vụ

| Trạng thái | Ý nghĩa |
|---|---|
| `Chờ duyệt` | Chưa được phép triển khai. |
| `Đã duyệt` | Được phép triển khai khi đủ phụ thuộc. |
| `Đang làm` | Đã bắt đầu trên nhánh riêng. |
| `Chờ kiểm thử` | Code đã xong, đang chạy test/QA. |
| `Chờ merge` | Đã test và tạo PR, chờ chủ dự án cho phép merge. |
| `Đã merge` | Đã merge vào master, CI xanh. |
| `Tạm dừng` | Chủ dự án yêu cầu dừng hoặc có blocker. |
| `Cần chủ xác nhận` | Phát sinh quyết định nghiệp vụ/an toàn chưa có trong mô tả. |

## Bảng tổng quan

| STT | Tên nhiệm vụ | Ưu tiên | Nhóm | Phụ thuộc chính | Trạng thái |
|---:|---|---|---|---|---|
| 1 | Chuẩn hóa quy trình triển khai theo task và quality gate | P0 | Nền tảng | — | Đã merge (PR #40) |
| 2 | Mở rộng Global Search thành tìm kiếm nghiệp vụ toàn hệ thống | P0 | Tìm kiếm | 1 | Đã merge (PR #40) |
| 3 | Tạo kết quả tìm kiếm dạng Customer/Work 360 có hành động tiếp theo | P0 | Tìm kiếm | 2 | Đã merge (PR #40) |
| 4 | Tạo Customer 360 dùng chung cho toàn hệ thống | P0 | Khách hàng | 3 | Đã merge (PR #40) |
| 5 | Xây Reception Flow hợp nhất tìm khách–tiếp nhận–đặt lịch | P1 | Lễ tân | 2, 4 | Đã merge (PR #40) |
| 6 | Chuẩn hóa chọn nguồn khách và CTV bằng ID | P1 | Dữ liệu | 4 | Đã merge (PR #40) |
| 7 | Nâng cấp xử lý trùng lịch và gợi ý giờ trống | P1 | Lịch hẹn | 5 | Đã merge (PR #40) |
| 8 | Tạo Next Action và work queue theo vai trò | P0 | Điều phối | 3, 4 | Đã merge (PR #40) |
| 9 | Tạo checklist an toàn trước khi khóa hồ sơ điều trị | P0 | Hồ sơ | 4 | Đã merge (PR #40) |
| 10 | Tách workspace hồ sơ điều trị theo vai trò | P1 | Hồ sơ | 9 | Đã merge (PR #44) |
| 11 | Tự động áp BOM vật tư khi thêm dịch vụ | P1 | Hồ sơ/Kho | 10 | Tạm dừng |
| 12 | Thêm badge trạng thái thiếu và luồng next action trong hồ sơ | P1 | Hồ sơ | 9, 10 | Chờ merge |
| 13 | Tạo activity log ngắn và lịch sử thay đổi dễ đọc | P2 | Audit | 9 | Đã merge (PR #40) |
| 14 | Chuẩn hóa state machine cho đề nghị thanh toán | P1 | Kế toán | 1 | Đã merge (PR #40) |
| 15 | Bỏ reload toàn trang sau xử lý PaymentRequest | P1 | Kế toán | 14 | Đã merge (PR #40) |
| 16 | Tự tạo đề nghị thanh toán từ lương/CTV/chi phí | P1 | Kế toán | 14 | Chờ merge |
| 17 | Liên kết hai chiều payment rail giữa hồ sơ và kế toán | P1 | Kế toán | 4, 14 | Chờ merge |
| 18 | Tạo action rail cho hộp thư CSKH | P1 | CSKH | 3, 4 | Đã merge (PR #40) |
| 19 | Tự phân công inbox và nhắc SLA | P1 | CSKH | 18 | Đã merge (PR #40) |
| 20 | Tạo action thay thế khi ngoài khung phản hồi | P2 | CSKH | 18, 19 | Chờ merge |
| 21 | Lưu bản nháp trả lời và cảnh báo rời hội thoại | P2 | CSKH | 18 | Đã merge (PR #40) |
| 22 | Tạo profile workspace Nhân sự | P1 | Nhân sự | 1 | Đã merge (PR #44) |
| 23 | Preset quyền theo chức danh và preview quyền | P1 | Phân quyền | 22 | Chờ merge |
| 24 | Quy trình nghỉ việc có checklist bàn giao | P1 | Nhân sự | 22 | Chờ merge |
| 25 | Quy trình thăng chức có diff quyền và ngày hiệu lực | P1 | Nhân sự | 22, 23 | Chờ merge |
| 26 | Profile CTV hợp nhất hồ sơ–tài khoản–khách–hoa hồng | P1 | CTV | 3, 4, 22 | Chờ merge |
| 27 | Bộ lọc CTV theo phạm vi 6 tháng và dữ liệu lỗi | P1 | CTV | 26 | Chờ merge |
| 28 | CTV portal có trạng thái khách và ngày hết phạm vi | P1 | CTV | 26, 27 | Chờ merge |
| 29 | Điều hướng theo nhiệm vụ và alias cho module ẩn | P1 | IA/Mobile | 2, 8 | Đã merge (PR #44) |
| 30 | Thanh truy cập nhanh mobile theo workload trong ngày | P2 | Mobile | 8, 29 | Chờ merge |
| 31 | Tự động tạo follow-up sau hoàn tất dịch vụ | P1 | Tự động hóa | 8, 10 | Chờ merge |
| 32 | Tự động phát hiện và xử lý dữ liệu CTV không khớp | P1 | Dữ liệu | 6, 26 | Chờ merge |
| 33 | Dashboard vận hành theo vai trò, ưu tiên việc cần làm | P1 | Dashboard | 8, 29 | Chờ merge |
| 34 | Bộ telemetry đo số bước, thời gian và điểm bỏ dở | P2 | Đo lường | 1, 8 | Chờ merge |
| 35 | Ma trận QA theo vai trò và kiểm thử hồi quy release | P0 | Chất lượng | 1–34 theo từng nhóm | Chờ merge |
| 36 | Rollout có feature flag, backup gate và checklist production | P0 | Vận hành | 35 | Chờ merge |

---

# Chi tiết từng nhiệm vụ

## Nhiệm vụ 1 — Chuẩn hóa quy trình triển khai theo task và quality gate

**Vấn đề:** Các nâng cấp lớn dễ bị làm dở giữa nhiều phiên nếu không có nguồn trạng thái duy nhất, bằng chứng test và quy tắc merge rõ ràng.

**Cần làm:** Chuẩn hóa thư mục `.task-memory`, trạng thái nhiệm vụ, nhánh feature, template PR, quality gate bắt buộc, cách ghi test evidence và quy tắc không tự merge. Bổ sung một script/checklist đọc danh sách task đã duyệt và báo task nào thiếu phụ thuộc hoặc thiếu test.

**Tác dụng:** Giúp chủ dự án chỉ cần gọi “làm nhiệm vụ 1–10”; Manus biết chính xác phải làm gì, làm đến đâu, test gì và không làm lan sang phần chưa duyệt.

**Phạm vi chính:** `.task-memory/`, tài liệu quy trình, template PR/quality gate; không thay đổi nghiệp vụ người dùng.

**Tiêu chí nghiệm thu:** Có thể đọc file trạng thái và xác định task được phép làm; mỗi task có branch, test evidence, PR và trạng thái; task chưa duyệt không bị đụng vào.

**Test bắt buộc:** Kiểm tra parser/checklist task, kiểm tra trạng thái giả lập `Chờ duyệt/Đã duyệt/Chờ merge/Đã merge`.

**Rủi ro/phụ thuộc:** Không có; phải làm trước các nhóm triển khai dài.

---

## Nhiệm vụ 2 — Mở rộng Global Search thành tìm kiếm nghiệp vụ toàn hệ thống

**Vấn đề:** Search hiện chỉ tìm khách hàng, hồ sơ điều trị, vật tư và kế hoạch; không tìm lịch hẹn, chứng từ, nhân sự, CTV, công nợ, hoa hồng và nhiều mã nghiệp vụ.

**Cần làm:** Mở rộng search contract theo `entityType`, `title`, `subtitle`, `status`, `href`, `nextAction`, `permissionScope`. Thêm Appointment, FollowUp, PaymentRequest, CashTransaction, User, Collaborator, Service và mã chứng từ. Ưu tiên exact code/5 số cuối trước fuzzy name; giữ giới hạn kết quả hợp lý và có “xem tất cả”.

**Tác dụng:** Nhân sự có thể tìm đúng đối tượng từ một ô Ctrl/Cmd+K thay vì nhớ module và tự dò nhiều bảng.

**Phạm vi chính:** `search-actions.ts`, `command-palette.tsx`, index/query cần thiết; không mở dữ liệu vượt quyền.

**Tiêu chí nghiệm thu:** Mỗi role chỉ thấy entity được phép; tìm được mã khách, mã hồ sơ, mã phiếu, tên CTV/nhân sự, lịch hẹn và 5 số cuối; kết quả hiển thị trạng thái và hành động phù hợp.

**Test bắt buộc:** Unit test exact/fuzzy/last5, permission scope, giới hạn kết quả; QA bằng từng role.

**Rủi ro/phụ thuộc:** Có thể cần index DB và cần review dữ liệu nhạy cảm.

---

## Nhiệm vụ 3 — Tạo kết quả tìm kiếm dạng Customer/Work 360 có hành động tiếp theo

**Vấn đề:** Kết quả search hiện chủ yếu là title/subtitle/href; người dùng phải mở từng route mới biết khách đang ở trạng thái nào.

**Cần làm:** Tạo result card dùng chung có mã, 5 số cuối, trạng thái hồ sơ, lịch gần nhất, công nợ, CTV/người phụ trách và `nextAction`. Action hiển thị theo permission: Mở hồ sơ, Ghi đến, Đặt lịch, Thu nợ, Ghi chăm sóc, Gắn hội thoại.

**Tác dụng:** Từ một lần tìm kiếm có thể đi thẳng đến hành động cần làm, giảm mở nhiều màn hình.

**Phạm vi chính:** result type, component UI, server query tổng hợp tối thiểu; giữ phone mask/audit.

**Tiêu chí nghiệm thu:** Kết quả khách có trạng thái và một action rõ; action không xuất hiện nếu role không có quyền; không query/hiển thị dữ liệu ngoài scope.

**Test bắt buộc:** Snapshot/component test, permission matrix, query scope, phone masking.

**Rủi ro/phụ thuộc:** Phụ thuộc nhiệm vụ 2 và các helper dữ liệu Customer 360.

---

## Nhiệm vụ 4 — Tạo Customer 360 dùng chung cho toàn hệ thống

**Vấn đề:** Thông tin khách bị phân tán giữa danh sách khách, hồ sơ khách, lịch, hồ sơ điều trị, inbox, công nợ và work queue.

**Cần làm:** Tạo component/loader Customer 360 mini-card dùng được ở search, lịch, queue, inbox, CTV portal và dashboard. Chuẩn hóa các trường: khách, mã, 5 số cuối, trạng thái hiện tại, lịch gần nhất, case gần nhất, công nợ, CTV, người phụ trách, cảnh báo và next action.

**Tác dụng:** Mọi nơi nhìn khách theo cùng một ngôn ngữ, giảm hỏi lại và giảm mở route.

**Phạm vi chính:** component + server loader + permission-aware fields.

**Tiêu chí nghiệm thu:** Một khách có cùng trạng thái ở các entrypoint; dữ liệu stale/không có được hiển thị rõ; action direct link đúng route.

**Test bắt buộc:** Loader test, role visibility test, empty/legacy data test.

**Rủi ro/phụ thuộc:** Phụ thuộc search contract; cần tránh query N+1.

---

## Nhiệm vụ 5 — Xây Reception Flow hợp nhất tìm khách–tiếp nhận–đặt lịch

**Vấn đề:** Lễ tân phải tự quyết định vào Tiếp nhận hay Lịch hẹn; khách mới có thể phải nhập lại dữ liệu khi chuyển bước.

**Cần làm:** Xây wizard: Tìm khách → chọn khách cũ hoặc tạo khách mới → mục đích (đặt lịch/mở hồ sơ/gọi lại) → ngày giờ/dịch vụ/người phụ trách → xác nhận. Giữ prefill xuyên bước và redirect đến màn hình “Đã tiếp nhận” có next actions.

**Tác dụng:** Biến thao tác tiếp nhận thành một quy trình duy nhất, giảm quyết định ban đầu và nhập lại.

**Phạm vi chính:** intake route, appointment form, prefill state, server actions; không xóa route cũ ngay, có thể redirect alias.

**Tiêu chí nghiệm thu:** Khách cũ không nhập lại tên/phone/source; khách mới nhập phone một lần; sau lưu có nút Mở hồ sơ/Đặt lịch/Gọi khách.

**Test bắt buộc:** E2E role lễ tân cho khách mới/cũ, duplicate phone, cancel/resume, validation.

**Rủi ro/phụ thuộc:** Phụ thuộc nhiệm vụ 2–4; cần review nghiệp vụ trước khi thay đổi redirect.

---

## Nhiệm vụ 6 — Chuẩn hóa chọn nguồn khách và CTV bằng ID

**Vấn đề:** `sourceDetail` text gây sai tên CTV, làm báo cáo và đồng bộ lịch sử khó tin cậy.

**Cần làm:** Thay input text bằng combobox CTV theo `collaboratorId`; hỗ trợ nguồn chiến dịch bằng danh mục riêng; hiển thị CTV đã chọn; báo lỗi nếu CTV inactive/không tồn tại; có flow tạo nhanh chỉ dành role được phép.

**Tác dụng:** Chấm dứt lỗi gõ tên, giữ doanh số/hoa hồng liên kết ổn định và giảm công việc rà soát.

**Phạm vi chính:** intake, appointment, lead, customer edit, collaborator query/schema.

**Tiêu chí nghiệm thu:** Tất cả dữ liệu mới có ID; đổi tên CTV không làm gãy lịch sử; không có record mới chỉ dựa vào tên tự do.

**Test bắt buộc:** Create/update customer/lead/appointment, inactive CTV, duplicate names, migration compatibility.

**Rủi ro/phụ thuộc:** Có thể cần xử lý dữ liệu cũ không khớp; không tự gán mù.

---

## Nhiệm vụ 7 — Nâng cấp xử lý trùng lịch và gợi ý giờ trống

**Vấn đề:** Khi xung đột, người dùng phải đọc cảnh báo và submit lần hai; chưa có danh sách xung đột/slot thay thế đủ trực quan.

**Cần làm:** Hiển thị lịch trùng theo khách/người/phòng/dịch vụ; đề xuất 3 slot trống gần nhất; cho phép đổi slot ngay trong dialog; một lần xác nhận override có lý do/audit.

**Tác dụng:** Giảm trao đổi thủ công và giảm đặt nhầm lịch.

**Phạm vi chính:** appointment conflict query/UI/action.

**Tiêu chí nghiệm thu:** Nhân sự nhìn thấy lý do xung đột, người đang bận, slot thay thế; override không cần nhập lại form.

**Test bắt buộc:** overlap boundary, timezone, follow-up vs appointment, override audit.

**Rủi ro/phụ thuộc:** Phụ thuộc dữ liệu phòng/người nếu hiện tại chưa chuẩn hóa.

---

## Nhiệm vụ 8 — Tạo Next Action và work queue theo vai trò

**Vấn đề:** Work queue hiện tốt nhưng chưa bao phủ mọi đối tượng và chưa luôn đưa người dùng đến hành động tiếp theo.

**Cần làm:** Chuẩn hóa event → task/next action: khách mới chưa đặt lịch, lịch sắp đến, follow-up, nợ, hồ sơ thiếu, inbox SLA, CTV sắp hết phạm vi, PaymentRequest chờ duyệt. Queue lọc theo role, ca, người phụ trách và mức quá hạn.

**Tác dụng:** Nhân sự không cần tự nhớ hoặc rà nhiều module; công việc tồn được kéo về một bảng điều hành.

**Phạm vi chính:** workqueue domain, task types, UI action inline, notification hooks.

**Tiêu chí nghiệm thu:** Mỗi item có owner, trạng thái, due date, link nguồn và action; xử lý xong item biến mất/cập nhật ngay.

**Test bắt buộc:** generation/dedup/status transitions, role scope, overdue calculation.

**Rủi ro/phụ thuộc:** Phụ thuộc Customer 360 và state machine; cần tránh tạo trùng task.

---

## Nhiệm vụ 9 — Tạo checklist an toàn trước khi khóa hồ sơ điều trị

**Vấn đề:** Khóa hồ sơ là quyết định ảnh hưởng toàn bộ dữ liệu nhưng hiện chưa có checklist blocking/warning đủ rõ.

**Cần làm:** Trước khi khóa, kiểm tra dịch vụ, BOM/vật tư, thanh toán/đối soát, cảnh báo y khoa, phiếu đồng ý, ảnh/tài liệu bắt buộc, follow-up và người phụ trách. Phân loại lỗi chặn và cảnh báo; admin override cảnh báo phải ghi lý do.

**Tác dụng:** Giảm hồ sơ chốt thiếu dữ liệu, giảm phải mở khóa và giảm rủi ro y tế/tài chính.

**Phạm vi chính:** lock action, validation helper, modal checklist, audit.

**Tiêu chí nghiệm thu:** Không khóa nếu lỗi blocking; warning có giải thích; override audit đủ người/thời gian/lý do.

**Test bắt buộc:** mỗi lỗi blocking, warning override, locked permissions, idempotency.

**Rủi ro/phụ thuộc:** Cần chủ dự án xác nhận trường nào bắt buộc theo nghiệp vụ/y khoa.

---

## Nhiệm vụ 10 — Tách workspace hồ sơ điều trị theo vai trò

**Vấn đề:** Một case hiển thị quá nhiều tab và finance rail cho mọi vai trò có quyền vào.

**Cần làm:** Tạo preset clinical, lễ tân/thu tiền, kế toán và admin; mỗi preset quyết định tab mặc định, rail, action và trường tài chính. Vẫn giữ route chung và permission server-side; UI không thay thế quyền.

**Tác dụng:** Người dùng nhìn đúng việc của mình, giảm quá tải và giảm thao tác sai.

**Phạm vi chính:** `ho-so/[id]/page.tsx`, tab config, role workspace config.

**Tiêu chí nghiệm thu:** Bác sĩ mở vào Tư vấn/ảnh; lễ tân mở lịch/thu; kế toán mở tài chính/chứng từ; admin có toàn cảnh; direct URL vẫn bị server gate.

**Test bắt buộc:** role matrix, default tab, hidden action, direct URL, mobile layout.

**Rủi ro/phụ thuộc:** Phụ thuộc nhiệm vụ 9; cần tránh làm người dùng mất khả năng xem thông tin cần phối hợp.

---

## Nhiệm vụ 11 — Tự động áp BOM vật tư khi thêm dịch vụ

**Trạng thái:** Tạm dừng — chủ dự án không duyệt, không triển khai trong đợt này.

**Quyết định nghiệp vụ:** Trung tâm có nhiều thủ thuật/phẫu thuật với mức độ và vật tư khác nhau; vật tư phải do nhân sự tự chọn và tự trừ theo ca thực tế. Giữ nguyên quy trình tự trừ vật tư hiện tại, không tự động áp BOM, không thay đổi số liệu kho.

**Phạm vi chính:** addCaseService, BOM helper, material usage, UI exception.

**Tiêu chí nghiệm thu:** Dịch vụ có BOM tự áp đúng một lần; retry không trừ đôi; thiếu kho không làm sai số liệu.

**Test bắt buộc:** quantity, duplicate retry, insufficient stock, rollback transaction, legacy manual path.

**Rủi ro/phụ thuộc:** Tác động tồn kho/tiền; cần backup/QA kỹ.

---

## Nhiệm vụ 12 — Thêm badge trạng thái thiếu và next action trong hồ sơ

**Lưu ý phạm vi:** Không tự động áp BOM. Badge chỉ được hiển thị cảnh báo khi nhân sự chưa tự ghi nhận vật tư theo quy trình thủ công hiện tại.


**Vấn đề:** Người dùng phải tự nhớ tab nào còn thiếu dữ liệu.

**Cần làm:** Tính checklist status theo case và hiển thị badge trên tab: Tư vấn thiếu, dịch vụ chưa trừ VT, tài chính còn nợ, tái khám chưa đặt, giấy tờ thiếu. Click badge mở đúng vùng.

**Tác dụng:** Giảm bỏ sót và rút ngắn thời gian hoàn tất case.

**Phạm vi chính:** case readiness helper, tab UI, next-action rail.

**Tiêu chí nghiệm thu:** Badge phản ánh dữ liệu thật; hoàn thành action cập nhật ngay; không hiển thị warning không áp dụng cho role.

**Test bắt buộc:** status matrix, empty/completed case, role visibility.

**Rủi ro/phụ thuộc:** Phụ thuộc checklist nhiệm vụ 9 và BOM nhiệm vụ 11.

---

## Nhiệm vụ 13 — Tạo activity log ngắn và lịch sử thay đổi dễ đọc

**Vấn đề:** Audit log phục vụ hệ thống nhưng người vận hành cần biết nhanh ai vừa sửa gì trong case.

**Cần làm:** Tạo case activity feed tóm tắt: dịch vụ thêm/sửa/xóa, payment, status, lock/unlock, follow-up, assignment; phân biệt log vận hành và audit pháp lý.

**Tác dụng:** Giảm hỏi nhau và hỗ trợ đối soát nhanh mà không đọc audit log thô.

**Phạm vi chính:** activity projection/query, case UI.

**Tiêu chí nghiệm thu:** Mỗi event có actor/time/action/link; không lộ payload nhạy cảm; audit gốc vẫn giữ.

**Test bắt buộc:** event ordering, actor, permission, pagination.

**Rủi ro/phụ thuộc:** Phụ thuộc các action hiện có và có thể cần index.

---

## Nhiệm vụ 14 — Chuẩn hóa state machine cho đề nghị thanh toán

**Vấn đề:** Trạng thái có nhưng chưa được trình bày như một quy trình nhất quán cho người dùng.

**Cần làm:** Chuẩn hóa `DRAFT → PENDING → APPROVED → PAID` và nhánh `REJECTED/CANCELLED`; hiển thị người/thời gian/lý do ở từng chuyển trạng thái; disable action sai trạng thái.

**Tác dụng:** Giảm nhầm “đã duyệt” với “đã chi”, giảm hỏi kế toán/admin.

**Phạm vi chính:** payment request domain, status badge/timeline.

**Tiêu chí nghiệm thu:** Không thể nhảy trạng thái sai; mọi chuyển trạng thái có actor/time/audit; UI có bước hiện tại và bước kế tiếp.

**Test bắt buộc:** full state transition matrix, duplicate submit, authorization, audit.

**Rủi ro/phụ thuộc:** Dữ liệu tiền; không đổi số tiền trong task này.

---

## Nhiệm vụ 15 — Bỏ reload toàn trang sau xử lý PaymentRequest

**Vấn đề:** `window.location.reload()` làm mất filter, scroll và ngữ cảnh sau mỗi duyệt/từ chối/chi.

**Cần làm:** Dùng server revalidation + client refresh vùng bảng/row state; giữ query params, page, sort, filter và vị trí scroll; hiển thị toast/error tại đúng row.

**Tác dụng:** Xử lý hàng loạt nhanh hơn và ít mất công tìm lại.

**Phạm vi chính:** request list, request-forms, action state, revalidation.

**Tiêu chí nghiệm thu:** Sau action row đổi trạng thái tại chỗ; filter/month/page không đổi; lỗi không xóa nội dung người dùng.

**Test bắt buộc:** approve/reject/pay, concurrent row, filter preservation, error state.

**Rủi ro/phụ thuộc:** Phụ thuộc state machine nhiệm vụ 14.

---

## Nhiệm vụ 16 — Tự tạo đề nghị thanh toán từ lương/CTV/chi phí

**Vấn đề:** Người dùng phải nhập lại type, tháng, payee, amount, category và lý do dù nguồn dữ liệu đã có.

**Cần làm:** Thêm nút “Tạo đề nghị” từ PayrollEntry, CommissionPayout và CashTransaction; prefill dữ liệu, cho sửa trường được phép, đánh dấu nguồn và chống tạo trùng.

**Tác dụng:** Giảm nhập lại và giảm sai người nhận/số tiền/tháng.

**Phạm vi chính:** source pages, request form, duplicate guard.

**Tiêu chí nghiệm thu:** Request tạo từ nguồn có liên kết hai chiều; tiền/tháng/payee đúng; duplicate được cảnh báo.

**Test bắt buộc:** each source type, duplicate, edit allowed fields, permission.

**Rủi ro/phụ thuộc:** Phụ thuộc state machine và schema liên kết.

---

## Nhiệm vụ 17 — Liên kết hai chiều payment rail giữa hồ sơ và kế toán

**Vấn đề:** Thu tiền trên case và chứng từ ở Kế toán có thể khiến người dùng phải mở hai nơi để đối chiếu.

**Cần làm:** Case hiển thị payment request/cash transaction liên quan; request hiển thị case/customer nguồn; trạng thái và số tiền lấy cùng nguồn sự thật.

**Tác dụng:** Giảm đối chiếu thủ công và tránh nhìn hai phiên bản trạng thái.

**Phạm vi chính:** relation/query/UI links, không tự tính lại tiền.

**Tiêu chí nghiệm thu:** Click hai chiều; khoản đã link không tạo dòng trùng; quyền che dữ liệu đúng role.

**Test bắt buộc:** linked/unlinked/duplicate/permission.

**Rủi ro/phụ thuộc:** Tác động tài chính, cần QA kỹ.

---

## Nhiệm vụ 18 — Tạo action rail cho hộp thư CSKH

**Vấn đề:** Gắn khách, phân công, SLA, trạng thái và trả lời nằm ở các block tách nhau.

**Cần làm:** Tạo action rail cạnh thread với Customer 360 mini-card, người phụ trách, trạng thái, SLA, gắn khách, tạo task và gửi trả lời. Sau khi gắn khách, card cập nhật ngay.

**Tác dụng:** Tăng xử lý một lần, giảm chuyển ngữ cảnh và sót thao tác.

**Phạm vi chính:** inbox detail, workflow actions, Customer 360.

**Tiêu chí nghiệm thu:** CSKH xử lý hội thoại chưa gắn khách trong cùng trang; gắn khách/assign/status cập nhật không mất thread.

**Test bắt buộc:** unlinked/linked, role, SLA, mobile layout.

**Rủi ro/phụ thuộc:** Phụ thuộc nhiệm vụ 3/4.

---

## Nhiệm vụ 19 — Tự phân công inbox và nhắc SLA

**Vấn đề:** Nhân sự phải tự chọn người xử lý; SLA hiển thị nhưng chưa chuyển thành queue/action đủ mạnh.

**Cần làm:** Rule auto-assign theo kênh/ca/tải; queue `chưa phân công`, `sắp quá hạn`, `quá hạn`; push/in-app reminder; cho override có lý do.

**Tác dụng:** Giảm hội thoại bị bỏ quên và giảm việc admin phân công thủ công.

**Phạm vi chính:** conversation workflow, scheduler/notification nếu có, inbox filters.

**Tiêu chí nghiệm thu:** Tin mới có owner/rule; SLA countdown đúng; quá hạn xuất hiện work queue; override audit.

**Test bắt buộc:** assignment rule, timezone, overload, inactive staff, duplicate notification.

**Rủi ro/phụ thuộc:** Phụ thuộc lịch ca và connector channel.

---

## Nhiệm vụ 20 — Tạo action thay thế khi ngoài khung phản hồi

**Vấn đề:** Hệ thống chỉ cảnh báo có thể gửi thất bại khi ngoài khung phản hồi.

**Cần làm:** Thêm nút tạo task gọi, ghi chú nội bộ, follow-up hoặc chuyển người phụ trách; giữ cảnh báo nền tảng.

**Tác dụng:** Cảnh báo biến thành công việc cụ thể thay vì bế tắc.

**Phạm vi chính:** inbox detail, task/follow-up actions.

**Tiêu chí nghiệm thu:** Người dùng chọn action thay thế; có owner/due date; không gửi nhầm qua kênh bị giới hạn.

**Test bắt buộc:** within/outside window, role, audit, task creation.

**Rủi ro/phụ thuộc:** Cần chốt nghiệp vụ follow-up/call task.

---

## Nhiệm vụ 21 — Lưu bản nháp trả lời và cảnh báo rời hội thoại

**Vấn đề:** Nội dung đang soạn có nguy cơ mất khi chuyển hội thoại hoặc refresh.

**Cần làm:** Lưu draft cục bộ theo conversation; cảnh báo rời khi có draft; khôi phục draft đúng user/device; nút xóa draft.

**Tác dụng:** Giảm gõ lại nội dung CSKH.

**Phạm vi chính:** MessageComposer, local storage hoặc draft model nếu cần.

**Tiêu chí nghiệm thu:** Draft không lẫn giữa conversation/user; không lưu dữ liệu nhạy cảm quá mức; gửi xong xóa draft.

**Test bắt buộc:** save/restore/clear, multiple tabs, privacy.

**Rủi ro/phụ thuộc:** Chốt chính sách lưu draft nếu nội dung chứa thông tin y tế.

---

## Nhiệm vụ 22 — Tạo profile workspace Nhân sự

**Vấn đề:** Bảng Nhân sự có quá nhiều action ngang hàng và làm quản trị hồ sơ, quyền, bảo mật, vòng đời bị trộn.

**Cần làm:** Profile nhân sự với 4 khu vực Hồ sơ, Quyền, Vòng đời, Bảo mật; bảng chỉ hiển thị trạng thái + action chính; action nguy hiểm vào menu riêng.

**Tác dụng:** Admin tìm đúng nhóm việc và giảm bấm nhầm khóa/xóa/reset.

**Phạm vi chính:** nhan-su page/detail/actions.

**Tiêu chí nghiệm thu:** Từ danh sách vào profile đúng người; mỗi khu vực có trạng thái; action nguy hiểm yêu cầu xác nhận rõ.

**Test bắt buộc:** admin role, retired/active, self-protection, direct URL.

**Rủi ro/phụ thuộc:** Không thay đổi chính sách quyền hiện tại.

---

## Nhiệm vụ 23 — Preset quyền theo chức danh và preview quyền

**Vấn đề:** Kéo thả permission key kỹ thuật khiến admin khó hiểu tác động.

**Cần làm:** Preset Lễ tân, Tư vấn, Bác sĩ, CSKH, Kế toán, Quản lý; diff giữa preset và hiện tại; preview menu/action/dữ liệu; cảnh báo quyền phone.full, finance, clinical.

**Tác dụng:** Cấp quyền nhanh và ít sai hơn.

**Phạm vi chính:** permission editor, permissions catalog, role preset config.

**Tiêu chí nghiệm thu:** Admin chọn preset thấy diff trước lưu; custom override vẫn giữ; hard barrier không bị phá.

**Test bắt buộc:** role/capability diff, grant/deny, CTV/cổ đông hard barrier.

**Rủi ro/phụ thuộc:** Phụ thuộc profile workspace và cần chủ duyệt preset.

---

## Nhiệm vụ 24 — Quy trình nghỉ việc có checklist bàn giao

**Vấn đề:** Chuyển `RETIRED` khóa tài khoản nhưng chưa biến việc bàn giao khách/lịch/inbox/ca đang mở thành checklist rõ ràng.

**Cần làm:** Trước retire, liệt kê khách, lịch, conversation, case, task và tài sản/quyền liên quan; cho chọn người nhận bàn giao; ghi snapshot và audit; sau xác nhận mới khóa.

**Tác dụng:** Giảm dữ liệu bị bỏ quên khi nhân sự nghỉ.

**Phạm vi chính:** staff lifecycle, reassignment actions, audit.

**Tiêu chí nghiệm thu:** Không retire mà không xử lý blocker hoặc admin override có lý do; tài khoản bị khóa ngay sau hoàn tất; lịch sử không mất.

**Test bắt buộc:** no workload, workload, self-retire, inactive target, rollback/error.

**Rủi ro/phụ thuộc:** Cần chủ chốt quy tắc bàn giao khách/hội thoại.

---

## Nhiệm vụ 25 — Quy trình thăng chức có diff quyền và ngày hiệu lực

**Vấn đề:** Đổi role/chức danh trực tiếp dễ khiến admin không thấy quyền nào mở thêm hoặc thay đổi từ ngày nào.

**Cần làm:** Flow chọn chức danh mới, preset quyền, ngày hiệu lực, ghi chú; preview diff quyền; lưu StaffRoleHistory; hỗ trợ rollback/đổi lại có audit.

**Tác dụng:** Thăng chức minh bạch, không xóa/tạo tài khoản mới và tránh cấp dư quyền.

**Phạm vi chính:** staff edit, permission preset, StaffRoleHistory.

**Tiêu chí nghiệm thu:** Diff trước/sau rõ; ngày hiệu lực lưu; userId không đổi; audit có actor/lý do.

**Test bắt buộc:** promotion/demotion, permission diff, effective date, rollback.

**Rủi ro/phụ thuộc:** Cần thống nhất quyền theo chức danh.

---

## Nhiệm vụ 26 — Profile CTV hợp nhất hồ sơ–tài khoản–khách–hoa hồng

**Vấn đề:** Admin chuyển giữa hiệu suất CTV, hồ sơ và portal để hiểu một CTV.

**Cần làm:** Tạo CTV profile: thông tin, tài khoản, trạng thái, khách đang thuộc phạm vi, hoa hồng, payout, lịch sử đồng bộ tên, audit và nút đặt lại mật khẩu/khóa.

**Tác dụng:** Một màn hình đủ để admin xử lý CTV.

**Phạm vi chính:** CTV admin page/detail, collaborator access, payout query.

**Tiêu chí nghiệm thu:** Từ bảng CTV vào profile theo ID, không encode tên; mọi số liệu cùng nguồn ID; action quyền đúng admin.

**Test bắt buộc:** registered/unregistered, rename, payout, scope, inactive.

**Rủi ro/phụ thuộc:** Phụ thuộc nhiệm vụ 6 và 4.

---

## Nhiệm vụ 27 — Bộ lọc CTV theo phạm vi 6 tháng và dữ liệu lỗi

**Vấn đề:** Admin chưa có hàng chờ rõ cho CTV chưa đăng ký, sắp hết phạm vi, hoa hồng chưa chi hoặc dữ liệu tên cần rà soát.

**Cần làm:** Thêm filters/status cards và list lỗi; hiển thị ngày assignment/hết phạm vi; cho mở batch rà soát nhưng không tự gán mù.

**Tác dụng:** Giảm rà soát thủ công và biết chính xác việc CTV cần xử lý.

**Phạm vi chính:** performance query, CTV admin UI, data quality queries.

**Tiêu chí nghiệm thu:** Mỗi filter có count và list đúng; inactive/expired không bị lẫn; không thay tiền.

**Test bắt buộc:** six-month boundary, legacy unmatched/duplicate, payout status.

**Rủi ro/phụ thuộc:** Phụ thuộc dữ liệu backfill/migration.

---

## Nhiệm vụ 28 — CTV portal có trạng thái khách và ngày hết phạm vi

**Vấn đề:** CTV portal hiện chủ yếu cho biết khách và tiền, chưa cho biết khách đang ở bước nào hoặc còn thuộc phạm vi đến khi nào.

**Cần làm:** Thêm trạng thái hồ sơ, lịch gần nhất, next action được phép, ngày hết phạm vi, filter sắp hết hạn; giữ mask phone và scope server-side.

**Tác dụng:** CTV tự phục vụ tốt hơn và giảm câu hỏi cho trung tâm.

**Phạm vi chính:** `/cong-tac-vien-cua-toi`, collaborator access, query.

**Tiêu chí nghiệm thu:** Không lộ khách hết hạn; ngày hết hạn tính đúng timezone; lịch sử hoa hồng cũ vẫn xem đúng policy.

**Test bắt buộc:** owner/non-owner/expired boundary/phone mask/direct URL.

**Rủi ro/phụ thuộc:** Cần chủ xác nhận CTV được xem đến mức trạng thái nào.

---

## Nhiệm vụ 29 — Điều hướng theo nhiệm vụ và alias cho module ẩn

**Vấn đề:** Module hidden/gộp tab khiến người mới phải nhớ chức năng nằm ở đâu.

**Cần làm:** Thêm alias nhiệm vụ vào search/menu: “Đề nghị thanh toán” → Kế toán; “Hộp thư” → Chăm sóc; “Hồ sơ điều trị” → Khách hàng; “Lịch tái khám” → Lịch hẹn/Việc hôm nay. Hiển thị breadcrumb đường đi.

**Tác dụng:** Tìm chức năng theo ngôn ngữ người dùng, không theo cấu trúc code.

**Phạm vi chính:** permissions/nav-tabs/search/command palette/breadcrumb.

**Tiêu chí nghiệm thu:** Gõ tên nghiệp vụ ra đúng route; route gộp hiển thị đường đi; role không có quyền vẫn không thấy.

**Test bắt buộc:** role nav, aliases, hidden route, mobile.

**Rủi ro/phụ thuộc:** Phụ thuộc search nhiệm vụ 2.

---

## Nhiệm vụ 30 — Thanh truy cập nhanh mobile theo workload trong ngày

**Vấn đề:** Bottom bar hiện chọn chủ yếu theo role, không phản ánh hôm nay người dùng đang có việc gì.

**Cần làm:** Cho phép chọn shortcut theo workload: nếu có việc đến hạn ưu tiên Việc hôm nay; nếu lễ tân có lịch ưu tiên Lịch hẹn; nếu CSKH SLA ưu tiên Hộp thư; vẫn giữ Tìm kiếm/Tất cả.

**Tác dụng:** Giảm số lần mở drawer trên điện thoại.

**Phạm vi chính:** AppShell, workqueue summary, mobile nav.

**Tiêu chí nghiệm thu:** Shortcut có logic fallback; không hiển thị route không có quyền; không chậm shell.

**Test bắt buộc:** each role, empty/full workload, responsive.

**Rủi ro/phụ thuộc:** Phụ thuộc work queue nhiệm vụ 8.

---

## Nhiệm vụ 31 — Tự động tạo follow-up sau hoàn tất dịch vụ

**Vấn đề:** Follow-up thường phụ thuộc trí nhớ nhân sự; dễ quên đặt lịch chăm sóc sau dịch vụ.

**Cần làm:** Mỗi dịch vụ có policy follow-up gợi ý; khi case hoàn tất, tạo task/draft follow-up; người dùng xác nhận/chỉnh ngày; không tự đặt lịch không có approval.

**Tác dụng:** Tăng tỷ lệ chăm sóc đúng hạn mà vẫn giữ người duyệt.

**Phạm vi chính:** service config, case completion, follow-up draft, work queue.

**Tiêu chí nghiệm thu:** Gợi ý đúng dịch vụ; không tạo trùng; có owner/date; chỉnh/hủy được; audit.

**Test bắt buộc:** service policy, completion retry, duplicate, timezone.

**Rủi ro/phụ thuộc:** Cần chủ xác nhận quy tắc follow-up theo từng dịch vụ.

---

## Nhiệm vụ 32 — Tự động phát hiện và xử lý dữ liệu CTV không khớp

**Vấn đề:** Dữ liệu cũ hoặc nguồn nhập text có thể không match collaboratorId; tự gán tên gần giống sẽ nguy hiểm.

**Cần làm:** Tạo data-quality report với exact match, duplicate candidate, unmatched; cho admin xác nhận từng nhóm hoặc từng record; lưu audit mapping; không đổi tiền.

**Tác dụng:** Làm sạch báo cáo CTV an toàn và giảm rà tay.

**Phạm vi chính:** data quality query, admin review UI, audit/mapping.

**Tiêu chí nghiệm thu:** Không auto-assign mù; mọi mapping có actor/time; rollback mapping được; báo cáo trước/sau.

**Test bắt buộc:** exact/duplicate/fuzzy/unmatched/rollback.

**Rủi ro/phụ thuộc:** Dữ liệu tài chính; cần backup trước batch mapping.

---

## Nhiệm vụ 33 — Dashboard vận hành theo vai trò, ưu tiên việc cần làm

**Vấn đề:** Dashboard có nhiều KPI/đồ thị nhưng không chắc trả lời “giờ tôi phải làm gì”.

**Cần làm:** Thêm hero block `Việc cần làm tiếp theo`, KPI phù hợp role, overdue, alert và deep link. Giảm tile không hành động hoặc đặt sau queue.

**Tác dụng:** Biến dashboard từ màn hình xem số liệu thành điểm bắt đầu công việc.

**Phạm vi chính:** dashboard, workqueue, role config.

**Tiêu chí nghiệm thu:** Mỗi role có next actions rõ; KPI có link xử lý; không trùng với work queue theo cách gây nhiễu.

**Test bắt buộc:** role dashboard, empty state, permission, performance.

**Rủi ro/phụ thuộc:** Phụ thuộc queue và Customer 360.

---

## Nhiệm vụ 34 — Bộ telemetry đo số bước, thời gian và điểm bỏ dở

**Vấn đề:** Chưa có dữ liệu định lượng để biết friction nào gây mất nhiều thời gian nhất.

**Cần làm:** Ghi event tối thiểu, không chứa dữ liệu nhạy cảm: flow_started/completed, route transition, validation error, abandon, reload/action time, next action completion. Dashboard nội bộ theo role/flow.

**Tác dụng:** Ưu tiên bằng dữ liệu thật thay vì cảm nhận.

**Phạm vi chính:** telemetry contract, privacy filter, analytics aggregation.

**Tiêu chí nghiệm thu:** Không lưu tên khách/phone/nội dung y tế; có consent/policy nội bộ; đo được median steps/time và abandon.

**Test bắt buộc:** redaction, event schema, offline retry, permission.

**Rủi ro/phụ thuộc:** Cần chủ duyệt chính sách dữ liệu/retention.

---

## Nhiệm vụ 35 — Ma trận QA theo vai trò và kiểm thử hồi quy release

**Vấn đề:** Một feature có thể build/test pass nhưng sai trải nghiệm hoặc lộ quyền ở role khác.

**Cần làm:** Tạo matrix role × flow × expected access/action/data; checklist E2E cho intake, appointment, case, payment, inbox, HR, CTV; lưu evidence trước PR.

**Tác dụng:** Giảm merge lỗi và đảm bảo mỗi nâng cấp không phá vai trò khác.

**Phạm vi chính:** tests/checks/docs/CI.

**Tiêu chí nghiệm thu:** Mỗi task có test unit/integration/E2E phù hợp; role deny/direct URL được kiểm; evidence link trong PR.

**Test bắt buộc:** typecheck, unit, integration, build, role smoke, migration dry-run nếu có.

**Rủi ro/phụ thuộc:** Phụ thuộc các task đã triển khai; không đánh dấu done nếu thiếu evidence.

---

## Nhiệm vụ 36 — Rollout có feature flag, backup gate và checklist production

**Vấn đề:** Nâng cấp liên quan tiền, quyền, y tế và migration cần rollout có thể kiểm soát.

**Cần làm:** Chuẩn hóa feature flag/rollback cho thay đổi lớn; checklist backup database/uploads, migrate deploy, smoke test role, log backfill, health check và kế hoạch rollback; chỉ bật production sau owner approval.

**Tác dụng:** Giảm rủi ro triển khai và giúp quay lại an toàn nếu flow mới có lỗi.

**Phạm vi chính:** deployment docs, config/flags, backup/health checks, release checklist.

**Tiêu chí nghiệm thu:** Có runbook copy/paste được; backup được kiểm tra restore; migration không dùng db push/reset; production evidence được lưu.

**Test bắt buộc:** dry-run QA, rollback/flag off, health check, role smoke.

**Rủi ro/phụ thuộc:** Phụ thuộc nhiệm vụ 35 và quy trình vận hành Windows.

---

# Quality gate bắt buộc cho mọi nhóm nhiệm vụ

Trước khi báo “xong”, Manus phải hoàn thành đủ các bước sau:

1. Đọc lại file này và chỉ làm các task đã có trạng thái `Đã duyệt`.
2. Đọc `02_state.md`, `03_decisions.md`, `04_sources.md` của dự án và kiểm tra branch/master hiện tại.
3. Tạo branch riêng theo nhóm task; không sửa trực tiếp master.
4. Kiểm tra phụ thuộc và ghi rõ task nào bị tách ra hoặc tạm dừng.
5. Viết/điều chỉnh test trước hoặc cùng lúc với code cho nghiệp vụ bị ảnh hưởng.
6. Chạy tối thiểu Prisma generate/validate nếu có schema, TypeScript, test liên quan, build và `git diff --check`.
7. Nếu liên quan quyền: chạy role matrix, direct URL, hidden action và dữ liệu nhạy cảm.
8. Nếu liên quan tiền: kiểm tra số tiền trước/sau, duplicate transaction, audit và rollback/error.
9. Nếu liên quan y tế: kiểm tra cảnh báo, lock state, consent, photo/document access và không lộ dữ liệu.
10. Cập nhật trạng thái task, evidence, open questions và changelog.
11. Tạo PR mô tả phạm vi, test, migration/backup requirement và rủi ro.
12. Chỉ merge khi người dùng nói rõ `merge nhóm nhiệm vụ ...` hoặc phê duyệt PR tương ứng.

# Quy tắc cập nhật sau mỗi phiên

Mỗi phiên triển khai phải cập nhật:

- Trạng thái từng task trong bảng tổng quan và chi tiết.
- Commit/PR/evidence test.
- Task nào bị block, lý do và quyết định cần chủ dự án.
- Phụ thuộc mới nếu phát sinh.
- Các giả định đã được xác minh hoặc bác bỏ.
- Checklist còn lại cho phiên sau.

# Không tự ý mở rộng

Không tự ý thêm module mới, đổi nghiệp vụ tiền/hoa hồng, đổi phạm vi dữ liệu CTV, đổi chính sách xem hồ sơ y tế, chạy migration production, thay đổi quyền mặc định hoặc merge master nếu chưa có task/approval tương ứng.

## Tài liệu nguồn

- `AUDIT_UX_VAN_HANH_2026-08.md`
- `.task-memory/ux-operational-audit/01_product_map.md`
- `.task-memory/ux-operational-audit/02_role_findings.md`
- `.task-memory/ux-operational-audit/03_prioritized_backlog.md`
- `.task-memory/ux-operational-audit/05_open_questions.md`
