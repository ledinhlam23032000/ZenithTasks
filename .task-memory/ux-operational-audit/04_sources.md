# Sources — UX audit

| Nguồn | Phạm vi sử dụng | Độ tin cậy |
|---|---|---|
| `web/src/components/layout/app-shell.tsx` | Sidebar, mobile drawer, bottom nav, search entrypoint | Primary source |
| `web/src/lib/permissions.ts` | Module, group, hidden route và role gate | Primary source |
| `web/src/lib/search-actions.ts` | Entity/global search thực tế | Primary source |
| `web/src/components/layout/command-palette.tsx` | Hành vi command palette và keyboard flow | Primary source |
| `web/src/app/(app)/tiep-nhan/new-customer.tsx` | Form tạo khách mới | Primary source |
| `web/src/app/(app)/lich-hen/new-appointment.tsx` | Form đặt lịch và conflict override | Primary source |
| `web/src/app/(app)/khach-hang/[id]/page.tsx` | Customer 360, timeline, next action, hành động khách | Primary source |
| `web/src/app/(app)/ho-so/[id]/page.tsx` | Tab clinical/stock/photo/doc, finance rail, follow-up, lock | Primary source |
| `web/src/app/(app)/viec-hom-nay/page.tsx` | Pattern work queue có action inline | Primary source |
| `web/src/app/(app)/cham-soc/hop-thu/[id]/page.tsx` | Gắn khách, phân công, SLA, thread/composer | Primary source |
| `web/src/app/(app)/ke-toan/de-nghi-thanh-toan/request-forms.tsx` | Modal/reload payment workflow | Primary source |
| `web/src/app/(app)/nhan-su/page.tsx` | Mật độ action và vòng đời nhân sự | Primary source |
| `web/src/app/(app)/nhan-su/permission-editor.tsx` | Cách admin cấp quyền hiện tại | Primary source |
| `web/src/app/(app)/cong-tac-vien/page.tsx` | Hiệu suất CTV và liên kết đăng ký | Primary source |
| `web/src/app/(app)/cong-tac-vien-cua-toi/page.tsx` | Portal và phạm vi 6 tháng | Primary source |
| `VERSION.md`, `web/BAN-GIAO.md`, `.task-memory/ctv-nhan-su-portal/02_state.md` | Version, safety gate và trạng thái dự án | Project source |

Không sử dụng dữ liệu ngoài Internet hoặc dữ liệu người dùng thật. Các nhận định về thời gian/tần suất thao tác được đánh dấu là cần kiểm chứng.
