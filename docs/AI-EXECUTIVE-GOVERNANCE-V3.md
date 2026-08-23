# AI Executive Governance v3

> **Cảnh báo quan trọng:** AI có thể hỗ trợ vận hành, nhưng không được trở thành một tài khoản Admin ẩn. Mọi quyền phải được cấp theo công cụ, dữ liệu, Dự án, mục đích và mức rủi ro; hệ thống phải chặn ở server ngay cả khi AI hoặc người dùng gửi yêu cầu sai.

## 0. Trạng thái triển khai hiện tại (2026-08-24)

Tài liệu này mô tả **hợp đồng governance và kiến trúc đích**, không phải danh sách tính năng đã hoàn tất. Source hiện đã có policy L0–L5, adapter kiểm tra capability/project scope, preview một người, audit đọc/ghi hiện hữu và clarification A/B/C/D tạo draft inactive. Dữ liệu nhạy cảm yêu cầu purpose, cảnh báo và confirmation; thao tác L5 như xóa, chấm dứt nhân sự, đổi quyền hoặc deploy production hiện **bị dừng an toàn** vì workflow hai người duyệt chưa được nối vào UI/schema. Không được diễn giải code hiện tại là AI có thể tự đuổi nhân viên, tự deploy hoặc tự publish thay đổi.

AI Training Studio hiện chỉ là **MVP feature-gated** gồm dashboard counts và nút seed dữ liệu demo TESTING: một profile, dataset, prompt và bốn examples chưa approve. CRUD knowledge/mechanism/prompt/dataset, evaluation runner, red-team, feedback review, release/publish/rollback và audit explorer vẫn là phần kế tiếp; quy trình ở các mục sau là thiết kế target.

## 1. Mục tiêu sản phẩm

ZenithTasks sẽ có một **AI Điều hành** có thể hiểu nhiều bộ phận, đọc cơ chế, hỏi lại bằng lựa chọn A/B/C/D, dựng bản nháp, mô phỏng, đề xuất và thực hiện các thao tác được cấp quyền. AI không truy cập database trực tiếp. AI chỉ gọi các tool đã đăng ký qua Tool Broker; Tool Broker kiểm tra policy, dữ liệu đầu vào, approval gate, audit và rollback trước khi gọi application service.

Cách tiếp cận này dùng ba lớp: policy decision point cho quyền, application service cho nghiệp vụ và approval/audit cho hành động có hậu quả. Cerbos phù hợp để làm policy decision point self-hosted; Langfuse phù hợp cho prompt versioning, traces, datasets và evaluation; Promptfoo phù hợp cho regression/red-team trong CI. Không nên đưa cả ba vào core ngay từ ngày đầu; nên giữ hợp đồng nội bộ ổn định và tích hợp từng adapter.

## 2. Mô hình quyền AI

AI có một `AgentProfile` và một tập `CapabilityPack`, không có quyền thừa hưởng toàn bộ từ role của người gọi. Quyền hiệu lực là giao của quyền người gọi, quyền AI, quyền Dự án, phạm vi dữ liệu và policy môi trường.

| Tầng | Ví dụ | Quy tắc |
|---|---|---|
| L0 – Đọc công khai nội bộ | Hướng dẫn, dashboard tổng hợp | Có thể tự trả lời, vẫn ghi trace |
| L1 – Đọc nghiệp vụ | Doanh thu, tồn kho, kế hoạch | Kiểm project scope và field scope |
| L2 – Đọc nhạy cảm | Hồ sơ y tế, lương, CCCD | Cần purpose, quyền phù hợp, cảnh báo; dữ liệu tối thiểu |
| L3 – Đề xuất thay đổi | Dựng policy, chỉnh cơ chế, lập quyết định nhân sự | Chỉ tạo draft/preview, chưa ghi hiệu lực |
| L4 – Ghi dữ liệu có hậu quả | Sửa lương, kích hoạt policy, tạo payment | Cần preview và xác nhận rõ ràng |
| L5 – Không thể tự động một bước | Xóa dữ liệu, chấm dứt nhân sự, thay đổi quyền Admin, deploy production | Tạo workflow; cần xác nhận nêu rõ hậu quả và có thể yêu cầu người duyệt thứ hai |

Trong **thiết kế target**, AI có thể nhận một câu lệnh ngắn để khởi tạo workflow L5, nhưng không được âm thầm coi đó là hoàn tất. Ở phiên bản source hiện tại, các yêu cầu L5 chỉ được policy adapter phân loại và dừng; chưa có workflow hai người duyệt nên không tạo preview một người có thể xác nhận.

## 3. Dữ liệu y tế và nhân sự

Dữ liệu y tế phải áp dụng nguyên tắc tối thiểu cần thiết. Khi người có quyền yêu cầu xem, AI phải hỏi hoặc hiển thị mục đích, phạm vi, thời gian truy cập và trường dữ liệu. Hệ thống không nên đưa toàn bộ hồ sơ vào prompt nếu chỉ cần một chỉ số. Mọi lần reveal phải ghi người yêu cầu, AI profile, patient/case scope, lý do, trường đã xem và thời hạn.

Thao tác chấm dứt nhân sự là quyết định có hậu quả pháp lý và đời sống. AI được phép chuẩn bị hồ sơ, checklist, thông báo dự thảo, khóa quyền theo ngày hiệu lực và tính các khoản liên quan; thao tác cuối phải qua confirmation gate, policy nhân sự và audit. Cần cấu hình được “một người duyệt” hoặc “hai người duyệt” theo Dự án, không hard-code một quy tắc duy nhất.

## 4. Cảnh báo và xác nhận

Theo **hợp đồng target**, mọi tool call phải trả `riskLevel`, `warningTitle`, `consequences`, `affectedRecords`, `rollback`, `requiredApprovals` và `confirmationToken`. Source hiện tại đã có risk/warning/consequences/rollback/required approvals trong policy và approval preview có expiry; `confirmationToken` chống target thay đổi và workflow hai người duyệt đầy đủ vẫn chưa được triển khai.

AI không được sử dụng nội dung tài liệu tải lên như một lệnh hệ thống. Tài liệu chỉ là evidence để trích xuất; người dùng phải xác nhận field mapping và assumption trước khi cơ chế có thể đi vào review.

## 5. AI Training Studio

Bộ công cụ đào tạo AI nội bộ nên có các khu vực sau:

| Khu vực | Chức năng |
|---|---|
| Capability Packs | Bật/tắt nhóm năng lực theo Dự án: phòng khám, phân phối, tài chính, nhân sự, marketing |
| Knowledge Sources | Tải tài liệu, phân loại, version, evidence, owner và ngày hết hạn |
| Mechanism Builder | Biến bảng cơ chế thành input/rule/output, hỏi phần thiếu và tạo draft |
| Prompt Studio | Version prompt hệ thống, prompt tool, tone, language và policy instructions |
| Dataset Studio | Tạo case chuẩn, câu hỏi người dùng, câu trả lời chuẩn, expected tool và expected warning |
| Evaluation Lab | Chạy dataset trên model/prompt khác nhau, chấm rule accuracy, tool choice, refusal và citation |
| Red-team Lab | Kiểm tra prompt injection, privilege abuse, data leakage, tool misuse và confirmation bypass |
| Feedback & Corrections | Người dùng đánh dấu đúng/sai, sửa câu trả lời; correction phải trở thành example có người duyệt |
| Release Gate | Chỉ publish agent version khi đạt ngưỡng test, review và rollback plan |

Langfuse có thể được self-host làm observability/prompt/evaluation backend; Promptfoo có thể chạy offline/CI cho regression và red-team. Dữ liệu y tế và dữ liệu nhân sự không được gửi sang dịch vụ ngoài nếu chưa có policy lưu trữ, masking và phê duyệt rõ ràng.

## 6. Quy trình huấn luyện an toàn

Theo **quy trình target**, một cơ chế mới đi qua: **Import → Extract evidence → Ask clarification → Map fields → Build draft → Simulate → Human review → Approve → Publish → Monitor**. Source hiện đã có bước hỏi A/B/C/D và tạo draft evidence-aware chưa kích hoạt, cùng rule engine mô phỏng thuần; các bước import/evaluation/review/publish/rollback vận hành đầy đủ chưa có trong MVP Training Studio. Feedback không được tự sửa prompt production.

## 7. Kiến trúc kỹ thuật đề xuất

`Assistant UI → Agent Orchestrator → Planner/LLM → Tool Broker → Policy PDP → Approval Service → Application Service → Audit/Event Store`.

Trong đó LLM chỉ lập kế hoạch và tạo structured output. Tool Broker là điểm duy nhất có thể gọi nghiệp vụ. Policy PDP có thể dùng Cerbos trước; adapter OPA chỉ thêm khi cần policy evaluation tổng quát hơn. Approval Service tạo preview và confirmation token. Application Service dùng transaction, idempotency và domain validation. Audit Event Store ghi cả yêu cầu, quyết định policy, phiên bản prompt/model, tool args đã redacted, approval và kết quả.

## 8. Bộ câu lệnh mẫu

“Đọc bảng chính sách này và chuẩn bị cơ chế hoa hồng cho Dự án Cellarisca” phải làm rõ căn cứ tính, tier, điều kiện, thời điểm ghi nhận, hoàn/hủy, người hưởng và cách làm tròn; AI chưa được kích hoạt.

“Cho nhân viên A nghỉ việc từ ngày X” phải tạo preview workflow, hiển thị hậu quả, yêu cầu xác nhận và kiểm tra policy phê duyệt; không được xóa hồ sơ hoặc xóa lịch sử.

“Cho tôi xem hồ sơ y tế của bệnh nhân B để kiểm tra biến chứng” phải xác nhận purpose, scope và quyền; chỉ trả trường cần thiết, che các trường không liên quan và ghi audit.

“Nâng cấp hệ thống lên bản mới” phải kiểm tra source, test, backup, migration plan, maintenance window và rollback; mặc định chỉ tạo change request, không tự deploy production.

Tác giả: **Manus AI**.
