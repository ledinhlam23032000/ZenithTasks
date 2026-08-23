# AI Training Studio Setup

## Phạm vi triển khai hiện tại

AI Training Studio trong phiên bản hiện tại là **MVP an toàn, feature-gated**, không phải một studio vận hành đầy đủ. Khi `ENABLE_AI_TRAINING_STUDIO=true` và migration đã có trong môi trường QA, ADMIN có thể mở dashboard, xem số lượng Agent Profile/Dataset/Evaluation Run và chạy nút seed dữ liệu demo. Seed tạo hoặc cập nhật một profile `ZENITH_EXECUTIVE_DEMO` ở trạng thái `TESTING`, dataset `GOVERNANCE_SMOKE`, prompt version và bốn training examples không chứa dữ liệu thật: clarification A/B/C/D, cảnh báo L5 nhân sự, cảnh báo L2 y tế và từ chối vượt quyền. Examples bắt đầu ở trạng thái chưa approved; không có thao tác publish production.

Khi feature flag tắt, trang chỉ hiển thị hướng dẫn khóa an toàn và **không truy vấn bảng Training Studio**. Không chạy seed trên database clinic thật. QA phải dùng database riêng, dữ liệu `DEMO_ONLY` và tài khoản theo role; credentials không được commit hoặc ghi vào tài liệu.

## Những gì chưa được triển khai

CRUD knowledge source, capability pack, mechanism import/builder, prompt editor, dataset editor, evaluation runner, red-team lab, feedback review, release gate publish/rollback và audit explorer đầy đủ **chưa có trong MVP**. Các bảng nền tảng đã được chuẩn bị cho việc mở rộng, nhưng không được coi là bằng chứng rằng UI hoặc lifecycle tương ứng đã vận hành.

## Quy trình target

| Bước | Người thực hiện | Trạng thái hiện tại |
|---|---|---|
| Tạo Agent Profile | ADMIN / AI Trainer | Có seed demo profile TESTING; chưa có CRUD UI |
| Nạp knowledge và evidence | Trainer | Chưa có UI/source ingestion |
| Nạp cơ chế và map field | Trainer + nghiệp vụ | Có V2 mechanism draft/rule engine; chưa có Training Studio builder |
| Viết examples A/B/C/D, warning, refusal | Trainer | Có bốn examples demo seed; chưa có editor |
| Chạy evaluation/red-team | Trainer | Chưa có runner UI; unit tests và QA smoke là gate hiện tại |
| Review và approve | ADMIN / chủ nghiệp vụ | Examples demo vẫn chưa approved |
| Publish/release/rollback | ADMIN | Chưa nối lifecycle publish |
| Monitor/feedback | Vận hành | Chưa có studio workflow đầy đủ |

## Nguyên tắc dữ liệu và release

Không dùng hồ sơ bệnh nhân thật, số điện thoại thật, CCCD, số tài khoản hoặc thông tin nhân sự thật trong dataset. Dữ liệu demo phải được gắn `DEMO_ONLY`; tài liệu nguồn phải được redaction trước khi đưa vào prompt hoặc evaluation. Khi cần truy vấn dữ liệu thật, AI phải truy vấn theo field scope trong runtime, không sao chép dữ liệu thật vào dataset đào tạo.

Theo thiết kế target, một Agent Profile chỉ được publish khi dataset đã approved, các test L5 không tự thực thi, dữ liệu nhạy cảm được mask đúng policy, tool call nằm trong project scope, hành động ghi có preview/confirmation và có rollback plan. Trong source hiện tại, L5 như xóa, chấm dứt nhân sự, đổi quyền hoặc deploy production vẫn **bị chặn an toàn** vì workflow hai người duyệt chưa được nối; Training Studio seed không bypass policy này.

Cerbos, Langfuse và Promptfoo có thể được tích hợp sau dưới dạng adapter optional. Hợp đồng nội bộ của ZenithTasks vẫn là nguồn sự thật cho mechanism, approval, project scope và audit. Feedback người dùng không được tự sửa prompt production.

Tác giả: **Manus AI**.
