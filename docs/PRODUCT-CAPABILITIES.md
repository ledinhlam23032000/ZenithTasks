# ZenithTasks — Năng lực sản phẩm và thành quả đã xây dựng

> **Sản phẩm:** Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc  
> **Mục đích tài liệu:** giúp chủ dự án, lập trình viên và AI tiếp quản hiểu nhanh hệ thống đang làm được gì, vì sao các luồng được thiết kế như hiện tại và cần kiểm tra ở đâu trước khi sửa.

## 1. Bức tranh tổng thể

ZenithTasks là ứng dụng web nội bộ vận hành trên máy chủ Docker của trung tâm. Nhân viên dùng trình duyệt hoặc PWA để tiếp nhận khách, mở hồ sơ điều trị, quản lý dịch vụ và vật tư, ghi nhận thanh toán, chăm sóc khách, theo dõi nhân sự, lương/hoa hồng, kho, kế toán và các chứng từ hành chính. Dữ liệu nghiệp vụ nằm trong PostgreSQL; số điện thoại đầy đủ được mã hóa, còn giao diện thông thường chỉ hiện năm số cuối.

Điểm cốt lõi của sản phẩm là **nhập một lần, liên kết nhiều phân hệ**. Dữ liệu được nhập tại nơi nghiệp vụ phát sinh sẽ trở thành nguồn cho hồ sơ, chứng từ, kế toán, báo cáo và bản in; hệ thống hạn chế tối đa việc nhân viên phải chép lại cùng một thông tin sang nhiều biểu mẫu.

## 2. Các năng lực nổi bật

| Năng lực | Giá trị vận hành | Nơi cần đọc trong mã nguồn |
|---|---|---|
| Tiếp nhận khách theo 5 số cuối | Tra cứu nhanh nhưng không phơi bày số điện thoại đầy đủ. | `web/src/app/(app)/tiep-nhan/`, `web/src/lib/phone.ts` |
| Hồ sơ điều trị thống nhất | Một hồ sơ liên kết dịch vụ, vật tư, thanh toán, ảnh, tái khám và **Hồ sơ dịch vụ thẩm mỹ**; toàn bộ tài liệu khách được tập trung tại tab Giấy tờ. | `web/src/app/(app)/ho-so/`, `web/prisma/schema.prisma` |
| Hồ sơ dịch vụ thẩm mỹ tự sinh | Tạo khách mới hoặc tiếp nhận khách sẽ có ngay hồ sơ mặc định; dữ liệu hành chính được tự điền và hồ sơ nằm trong kho Giấy tờ chung. | `web/src/lib/consultation-sheet.ts`, `web/src/app/(app)/tiep-nhan/actions.ts`, `web/src/app/(app)/ho-so/[id]/page.tsx` |
| Tiền sử dạng checklist | Mỗi mục có **Bình thường/Bất thường**; mặc định Bình thường và có ô ghi chú nếu bất thường. | `web/src/app/(app)/ho-so/[id]/case-widgets.tsx`, `web/src/lib/consultation-sheet.ts` |
| Hồ sơ dịch vụ thẩm mỹ có thể chỉnh và in | Nhân sự có quyền lâm sàng sửa phần chữ hiển thị, xem trước, in/Lưu PDF hoặc tải Word; dữ liệu nguồn vẫn được bảo vệ. | `web/src/app/(app)/ho-so/[id]/consultation/`, `web/src/app/(app)/ho-so/actions.ts` |
| Thu chi gắn Đề nghị thanh toán | Một khoản Chi tự sinh phiếu đề nghị thanh toán; kế toán duyệt/xác nhận trên cùng liên kết, chống tạo dòng chi trùng. | `web/src/app/(app)/thu-chi/`, `web/src/app/(app)/ke-toan/de-nghi-thanh-toan/`, `web/src/lib/payment-request.ts` |
| Backfill lịch sử | Dữ liệu cũ thiếu phiếu được bổ sung idempotent khi container khởi động; chạy lại không tạo trùng. | `web/scripts/backfill-cash-payment-requests.ts`, `web/scripts/backfill-consultation-sheets.ts`, `web/docker-entrypoint.sh` |
| Sổ tư vấn có kiểm soát thời gian | Sau 24 giờ chỉ ADMIN được sửa bổ sung; thao tác sửa muộn có audit. | `web/src/app/(app)/ho-so/actions.ts`, `ConsultationRecord` |
| Tài chính có khóa và đối soát | Sổ thu–chi, công nợ, thanh toán, lương và hoa hồng dùng transaction, khóa hồ sơ và cảnh báo lệch dữ liệu. | `web/src/lib/financial-summary.ts`, `web/src/app/(app)/thu-chi/actions.ts` |
| AI có giám sát | AI đọc knowledge map, tạo preview, cần approval cho thao tác ghi, kiểm quyền server-side và audit; không tự sửa mù production. | `web/src/app/(app)/tro-ly/agent.ts`, `docs/AI-ADMIN-GATEWAY.md` |
| Hộp thư đa kênh | Facebook Messenger và Zalo OA có webhook, phân công, SLA, mẫu trả lời và thông báo; AI chỉ soạn nháp khi chưa được cho phép tự gửi. | `web/src/app/(app)/cham-soc/`, `web/src/app/api/webhooks/` |
| Vận hành có đường lui | Backup, migration additive, Docker rebuild, smoke test và script Windows được ghi thành runbook. | `docs/OPERATIONS-RUNBOOK.md`, `windows/Sua-Loi.bat`, `web/DEPLOY.md` |

## 3. Các luồng tự động quan trọng

### 3.1. Từ khách hàng đến Hồ sơ dịch vụ thẩm mỹ

Khi nhân viên tạo khách mới, hệ thống tạo trong cùng transaction một `Customer`, một `CaseRecord` nháp và một `ConsultationRecord`. Khi nhân viên tiếp nhận khách đã tồn tại, hệ thống tạo `CaseRecord` và `ConsultationRecord` nếu hồ sơ điều trị mới chưa có phiếu. `ConsultationRecord` được khởi tạo với checklist tiền sử ở trạng thái Bình thường; nhu cầu dịch vụ và dịch vụ quan tâm được lưu snapshot để dùng cho bản in.

Trang `/ho-so/[id]/consultation` là nguồn xem trước/in. Route `/ho-so/[id]/consultation/print` mở bản HTML A4 để in hoặc Lưu thành PDF. Route `/ho-so/[id]/consultation-export` tải bản tương thích Microsoft Word. Nội dung chỉnh sửa riêng cho bản in nằm trong `ConsultationRecord.printOverrides`; hệ thống không dùng trường này để âm thầm thay đổi số điện thoại đầy đủ hoặc số liệu nguồn.

### 3.2. Từ khoản Chi đến Kế toán

Khi tạo khoản Chi, hệ thống tạo `CashTransaction` và `PaymentRequest` liên kết. Phiếu có mã `DNT-...`, dữ liệu người nhập, lý do, địa chỉ, số tiền bằng chữ và trạng thái. Kế toán xem cùng chứng từ, ADMIN duyệt hoặc từ chối, sau đó xác nhận thanh toán. Nếu phiếu đã gắn với dòng Chi, bước thanh toán chỉ cập nhật trạng thái và không tạo thêm dòng Chi.

Các khoản Chi lịch sử chưa có phiếu được backfill bằng script idempotent sau migration. Phiếu cũ đã ghi sổ được tạo ở trạng thái phù hợp với lịch sử; các liên kết lương/hoa hồng hiện hữu được nhận diện để tránh tạo chứng từ vận hành thứ hai.

### 3.3. Từ hồ sơ đến bản in có ký

Các bản in hành chính được dựng từ dữ liệu đã chuẩn hóa, có vùng ký tay và có route xem trước riêng. Khi chỉnh layout, phải kiểm tra cả bản mới và bản cũ đã duyệt/đã thanh toán vì cùng một renderer được dùng lại khi mở/in. Không sửa trực tiếp file PDF đã tải xuống; muốn có bản mới phải mở lại chứng từ và xuất lại.

## 4. Nguyên tắc dữ liệu và an toàn

> **Nguồn dữ liệu nghiệp vụ không bị thay thế bởi nội dung trình bày.** Phần chỉnh sửa để in phải lưu thành override/snapshot có audit; số tiền, giao dịch, trạng thái duyệt và dữ liệu nhạy cảm phải lấy từ nguồn chuẩn hoặc được sửa qua action nghiệp vụ có quyền.

Mọi thao tác ghi dùng Server Action và kiểm quyền ở server. Hồ sơ đã khóa chỉ ADMIN được mở lại hoặc sửa. Các migration phải additive, được chạy bằng `prisma migrate deploy`; tuyệt đối không chạy `prisma db push`, `migrate reset` hoặc xóa Docker volume trên dữ liệu thật. Khi triển khai bản có migration, sao lưu trước, chạy `windows\\Sua-Loi.bat`, xem log migration/backfill và thực hiện smoke test.

## 5. Kho giấy tờ trong hồ sơ điều trị

Tab **Giấy tờ** chỉ còn một khu vực **Hồ sơ dịch vụ thẩm mỹ**. Khu vực này chứa bản hồ sơ điện tử tự sinh, các Phiếu đồng ý đã ghi nhận và mọi tài liệu bổ sung như xét nghiệm, ảnh, PDF, Word hoặc Excel. Nút **+ Thêm giấy tờ** mở các thao tác tương ứng mà không xóa hay di chuyển dữ liệu lịch sử.

## 6. Trung tâm Hệ thống

Sidebar chỉ hiển thị một mục **Hệ thống** cho ADMIN. Trang `/he-thong` là trung tâm tổng quan gồm cảnh báo bảo mật, trạng thái backup, quy mô dữ liệu, dung lượng lưu trữ và hoạt động nhạy cảm gần đây; đồng thời có các lối vào rõ ràng tới `/nhat-ky` để lọc/xuất audit đầy đủ và `/cham-soc/ket-noi` để quản lý Zalo OA/Facebook Page. Hai route con và quyền server-side vẫn được giữ để không làm hỏng bookmark hoặc thao tác nội bộ, nhưng không còn chiếm ba dòng riêng trên sidebar.

Thư viện quản trị **Mẫu phiếu đồng ý** không còn là module vận hành và đã được gỡ khỏi điều hướng/quyền module. Các phiếu đồng ý đã ghi trong hồ sơ khách vẫn giữ nguyên nội dung; dữ liệu lịch sử không bị xóa. Luồng ghi phiếu trong hồ sơ vẫn có thể lưu nội dung trực tiếp và không phụ thuộc vào việc còn màn hình quản lý thư viện mẫu.

Định hướng mở rộng đã được phê duyệt ở mức giao diện là biến Hệ thống thành trung tâm kiểm soát vận hành: backup quá hạn, cảnh báo bảo mật, webhook chưa cấu hình và hoạt động nhạy cảm đều có thể hiện thành thẻ có mức độ và đường dẫn xử lý. Phần tự động hóa sâu hơn chỉ triển khai sau khi chủ dự án duyệt riêng.

## 7. Bản đồ tiếp quản nhanh

| Nếu muốn sửa… | Đọc trước |
|---|---|
| Hồ sơ dịch vụ thẩm mỹ, checklist, bản in | `web/src/lib/consultation-sheet.ts`, `web/src/app/(app)/ho-so/actions.ts`, `web/src/app/(app)/ho-so/[id]/consultation/` |
| Đề nghị thanh toán, Thu chi, Kế toán | `web/src/lib/payment-request.ts`, `web/src/app/(app)/thu-chi/`, `web/src/app/(app)/ke-toan/de-nghi-thanh-toan/` |
| Dữ liệu và migration | `web/prisma/schema.prisma`, `web/prisma/migrations/` |
| AI và approval | `docs/AI-ADMIN-GATEWAY.md`, `web/src/app/(app)/tro-ly/agent.ts` |
| Quyền và audit | `web/src/lib/permissions.ts`, `web/src/lib/auth.ts`, `web/src/lib/audit.ts` |
| Cập nhật máy Windows | `docs/OPERATIONS-RUNBOOK.md`, `windows/Sua-Loi.bat`, `windows/Sua-Loi.ps1` |
| Lịch sử quyết định | `CHANGELOG.md`, `web/DU-AN.md`, `.task-memory/` |

## 8. Quy tắc ghi nhận các bản vá về sau

Mỗi bản vá phải ghi rõ vấn đề thực tế, nguyên nhân, thay đổi chính, ảnh hưởng dữ liệu, quyền liên quan, migration/backfill nếu có, test đã chạy và cách người vận hành cập nhật. Nếu là thay đổi nghiệp vụ, cập nhật `CHANGELOG.md` và `web/DU-AN.md`. Nếu là thay đổi kiến trúc hoặc vận hành, cập nhật thêm `VERSION.md`, `web/BAN-GIAO.md`, `docs/INDEX.md` hoặc `docs/OPERATIONS-RUNBOOK.md` tùy phạm vi.

Không ghi nhận số liệu kiểm thử hoặc trạng thái production nếu chưa có bằng chứng từ lệnh/CI/checkpoint tương ứng. Không đưa dữ liệu khách thật, mật khẩu, API key, file `.env` hoặc backup vào GitHub.

## 9. Tham chiếu

Đây là tài liệu mô tả nội bộ, không thay thế mã nguồn. Khi có mâu thuẫn, ưu tiên schema/migration và server action trên `master`, sau đó cập nhật tài liệu trong cùng release.
