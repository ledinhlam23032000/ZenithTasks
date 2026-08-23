# Ứng dụng quản trị — Trung tâm Phẫu thuật Tạo hình Thẩm mỹ (BVĐK Hồng Phúc)

> **Phiên bản chuẩn hiện tại:** xem [`VERSION.md`](VERSION.md) — release code r6, commit `0f81781` · **Ngày:** 18/08/2026<br>
> Muốn biết bản mới nhất có gì, đọc [`VERSION.md`](VERSION.md). Muốn xem lịch sử thay đổi, đọc [`CHANGELOG.md`](CHANGELOG.md).

Ứng dụng web **nội bộ** quản lý phòng khám thẩm mỹ: tiếp nhận khách, lịch hẹn, hồ sơ điều trị
(dịch vụ · vật tư · thanh toán · ảnh trước/sau/tái khám/cận lâm sàng), sổ tư vấn điện tử, chăm sóc khách, báo cáo
doanh thu & lãi/lỗ, nhân sự, thỏa thuận bảo mật/không cạnh tranh, chấm công, lương/hoa hồng, chứng từ thanh toán, kho, sổ thu chi, cộng tác viên, hiệu suất.

Có **cổng khách hàng** (link riêng) và **đặt lịch online**.

> Toàn bộ ứng dụng nằm trong thư mục **`web/`**. Stack: Next.js 16 + React 19 + TypeScript +
> Tailwind v4 + PostgreSQL/Prisma 7, chạy bằng Docker. Trợ lý AI hỗ trợ upload/đọc file, feedback và nhập giọng nói có kiểm duyệt.

---

## 📖 Đọc gì trước? (dành cho lập trình viên / AI tiếp quản)

| File | Nội dung |
|------|----------|
| **[`VERSION.md`](VERSION.md)** | **ĐỌC ĐẦU TIÊN.** Phiên bản chuẩn, commit hiện tại, tính năng đã có, migration gần đây, kiểm tra chất lượng và giới hạn còn lại. |
| **[`CHANGELOG.md`](CHANGELOG.md)** | Lịch sử các nâng cấp gần đây theo commit và nhóm chức năng. |
| **[`web/BAN-GIAO.md`](web/BAN-GIAO.md)** | **BẮT ĐẦU KỸ THUẬT TỪ ĐÂY.** Kiến trúc, mô hình dữ liệu, phân quyền, logic nghiệp vụ, quy ước phát triển, bảo mật, cách chạy/kiểm thử và cạm bẫy đã gặp. |
| **[`ROADMAP.md`](ROADMAP.md)** | **MUỐN LÀM TIẾP? ĐỌC ĐÂY.** Bảng theo dõi tiến độ A→E (✅ xong / ⏳ chưa / 🔑 cần khoá-tài khoản) + chi tiết từng đợt + việc còn lại + việc của chủ. Đây là nơi biết "nên làm gì tiếp theo". |
| [`docs/INDEX.md`](docs/INDEX.md) | Chỉ mục nguồn sự thật và thứ tự đọc dành cho AI/người tiếp quản. |
| [`docs/PRODUCT-CAPABILITIES.md`](docs/PRODUCT-CAPABILITIES.md) | Bản đồ năng lực sản phẩm, luồng tự động, ưu điểm vận hành và nơi sửa từng phân hệ. **Đọc khi cần hiểu nhanh thành quả dự án.** |
| [`docs/AI-ADMIN-GATEWAY.md`](docs/AI-ADMIN-GATEWAY.md) | Registry AI, quyền, preview, approval, audit và workflow thay đổi code. |
| [`docs/OPERATIONS-RUNBOOK.md`](docs/OPERATIONS-RUNBOOK.md) | Runbook backup, cập nhật Windows, migration, smoke test và xử lý sự cố. |
| [`UPGRADE-HANDOFF-2026-08.md`](UPGRADE-HANDOFF-2026-08.md) | Biên bản nâng cấp chi tiết và bằng chứng các release production. |
| [`web/DU-AN.md`](web/DU-AN.md) | Nhật ký thay đổi chi tiết theo từng đợt (lịch sử + lý do từng quyết định). |
| [`web/AGENTS.md`](web/AGENTS.md) | Lưu ý: Next.js 16 khác bản cũ — đọc docs trong `node_modules/next/dist/docs/` trước khi viết. |
| [`web/DEPLOY.md`](web/DEPLOY.md) | Hướng dẫn triển khai & vận hành chi tiết. |
| [`AI-AGENT-RESEARCH.md`](AI-AGENT-RESEARCH.md) | Nền tảng thiết kế Trợ lý AI: tool whitelist, structured output, approval và giới hạn an toàn. |
| [`PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md) | Bản giới thiệu tổng quan dự án (số liệu quy mô đã kiểm chứng). |

> Nếu bạn dùng AI coding agent: hãy đọc [`docs/INDEX.md`](docs/INDEX.md) trước, sau đó đọc [`docs/PRODUCT-CAPABILITIES.md`](docs/PRODUCT-CAPABILITIES.md), `web/AGENTS.md` và tài liệu nền. `web/CLAUDE.md` vẫn mô tả các quy tắc nạp ngữ cảnh riêng cho Claude Code.

## 🔄 Cập nhật lên bản mới nhất

Nhánh chuẩn là `master`. Trên máy phát triển dùng `git pull --ff-only origin master`; trên máy Windows vận hành dùng `windows\\Sua-Loi.bat`, sau khi sao lưu nếu bản cập nhật có migration. Không chạy `prisma db push` trên dữ liệu thật.

## 🚀 Chạy nhanh

**Bằng Docker (giống vận hành thật):** tại thư mục gốc
```bash
cp .env.example .env       # điền khoá nếu muốn; để trống = tự sinh an toàn
docker compose up --build
# Mở http://127.0.0.1:3000 — lần đầu CSDL trống phải cấu hình BOOTSTRAP_ADMIN_* trong .env.
```

**Lập trình (dev):**
```bash
cd web
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy    # cần DATABASE_URL trỏ tới PostgreSQL
pnpm dev                           # http://127.0.0.1:3000
pnpm exec tsc --noEmit && pnpm test -- --run # kiểm tra biên dịch + test
```

**Triển khai trên máy Windows (máy chủ phòng khám):** dùng các script trong [`windows/`](windows/)
(`Chay-Zenith.bat` để cài/chạy, `Sua-Loi.bat` để cập nhật sạch, `Sao-Luu.ps1` để sao lưu).

## 🔐 Bảo mật (đọc kỹ trước khi chia sẻ)
- **Repo phải để PRIVATE.** Dữ liệu khách hàng thật (SĐT mã hoá AES-256-GCM) nằm trên máy chủ phòng khám, KHÔNG nằm trong repo.
- Khoá bí mật (`AUTH_SECRET`) tự sinh mỗi máy, lưu trong volume Docker, **không commit**. `PHONE_ENC_KEY` phải là secret ổn định do operator quản lý; đổi khoá phải mã hoá lại dữ liệu (xem `web/DEPLOY.md`).
- File `.env` (khoá thật) **không bao giờ** được commit. Mẫu ở `.env.example`.

## 🗺️ Cấu trúc kho
```
web/        Ứng dụng Next.js (mã nguồn chính)
windows/    Script .bat/.ps1 cài đặt & vận hành trên Windows
client/     App máy con (mở trình duyệt vào máy chủ)
docker-compose.yml   Chạy toàn hệ thống (web + PostgreSQL) — dùng khi vận hành
.env.example         Mẫu cấu hình khoá/biến môi trường
```

## Hộp thư Zalo OA + Facebook Fanpage

Hộp thư đa kênh nằm tại **Chăm sóc KH → Hộp thư mới**. Hệ thống chỉ nhận tin phát sinh sau lúc kết nối, cho phép nhân viên trả lời ngay trong ZenithTasks và vẫn giữ nguyên tab **Nhật ký thủ công**. Cấu hình provider nằm trong `.env`; khóa token và secret bảo trì có thể để trống để Docker tự sinh một lần trong volume `zenith_secrets`.

Quy trình kích hoạt: cấu hình domain HTTPS và biến trong `.env` → `docker compose up -d --build` → chạy `windows/Cai-Bao-Tri-Kenh.bat` → ADMIN mở `/cham-soc/cai-dat` và lần lượt bấm kết nối Zalo OA/Facebook. Hướng dẫn callback, quyền app review, test và rollback đầy đủ ở [`web/DEPLOY.md`](web/DEPLOY.md#hộp-thư-zalo-oa--facebook-fanpage).
