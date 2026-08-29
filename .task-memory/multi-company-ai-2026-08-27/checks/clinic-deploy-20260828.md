# Triển khai clinic (production) — 2026-08-28

Owner gate: chủ dự án đã chốt "chốt lên pk" trong phiên 2026-08-28.

## Backup TRƯỚC khi deploy
Thư mục: `/c/Users/PC/zenith-backup-truoc-deploy-20260828-232211`
- `clinic.dump` (pg_dump -Fc, 293KB)
- `clinic.sql` (plain SQL, 428KB) — đã verify 70 CREATE TABLE + 70 COPY
- `uploads.tgz` (19MB, volume zenithtasks_zenith_uploads)

## Sự cố phát hiện trong lúc chuẩn bị
Build clinic ĐANG HỎNG từ trước: `cross-env` có trong package.json nhưng không
có trong pnpm-lock.yaml -> `pnpm install --frozen-lockfile` trong Dockerfile
fail. Không ai phát hiện vì chưa ai rebuild kể từ lúc đó. Đã gỡ dependency
(không còn script nào dùng) trong commit 76f7da8, build lại thành công.

## Migration đã apply (7)
20260826160000_payroll_two_person_governance
20260826170000_workspace_customer_consent_lifecycle
20260826180000_workspace_config_proposals
20260827190000_ai_agent_hierarchy
20260828130000_ai_job_contract
20260828220000_ai_job_approval_and_lifecycle_enums
20260828230000_tenant_scoped_uniques_and_audit_indexes

## Bằng chứng sau deploy
| Kiểm tra | Kết quả |
|---|---|
| Dữ liệu trước deploy | Customer=18 Case=20 Payment=18 Audit=632 |
| Dữ liệu sau deploy | Customer=18 Case=20 Payment=18 Audit=632 — KHÔNG mất bản ghi nào |
| Index/unique mới | 6/6 có mặt trên clinic DB |
| Enum PENDING_APPROVAL | có |
| `/login` (chưa đăng nhập) | 200 |
| Smoke ADMIN (JWT ký bằng AUTH_SECRET runtime) | /dashboard /ho-so /luong /ke-toan /thu-chi /nhat-ky /he-thong /du-an đều 200 |

## Giới hạn của bằng chứng này
Đây là smoke test HTTP có xác thực, KHÔNG phải kiểm thử nghiệp vụ đầy đủ. Chưa
thao tác ghi thật trên clinic (không tạo/sửa/xoá bản ghi nào). Các fix về tiền
(hoa hồng bác sĩ, double-submit chi lương, race payroll) đã có unit test và
integration test trên QA nhưng chưa được quan sát trên dữ liệu clinic thật.
