# Biên bản đồng bộ release — 2026-08-24

## Kết luận điều hành

Sự cố Cloudflare 502 đã được khôi phục bằng cách giữ nguyên hostname public và thay origin của route chính từ `http://localhost:3000` sang `http://127.0.0.1:3000`. Sau khi owner bấm Save trên Cloudflare, endpoint public `/login` trả HTTP 200. Database, uploads, Docker volume và dữ liệu nghiệp vụ không bị reset hoặc xóa.

Phiên này tách rõ **gói operational sync đã được kiểm thử và push** khỏi **gói AI Governance/V2/Training đang chờ review**. Gói AI không được commit hoặc deploy mù vì schema hiện còn các liên kết User/owner/approver dạng scalar và UI hiện mới là demo shell flag-gated, chưa tương đương workflow governance đầy đủ trong tài liệu thiết kế.

## Ma trận nguồn sự thật

| Vùng | Nguồn chính | Đồng bộ đã thực hiện | Trạng thái |
|---|---|---|---|
| Origin kỹ thuật | Cloudflare route + `docker-compose.yml` + script Windows | Dùng `127.0.0.1:3000` cho origin/health-check; hostname public giữ nguyên | Đã xác minh public HTTP 200 |
| Cập nhật app | `windows/Chay-Zenith.ps1`, `windows/Sua-Loi.ps1`, `windows/Tu-Dong-Cap-Nhat.ps1` | DB chạy riêng; build/recreate chỉ service `app`; auto-update bỏ qua repo bẩn; không tự reset/stash | Đã parse cú pháp |
| Cấu hình runtime | `.env.example`, `web/.env.example`, `docker-compose.yml` | Bổ sung AI timeout/writer, voice, UX rollout và feature flags; mặc định V2/Training là false | `docker compose config` đạt |
| Kiểm tra release | `windows/Kiem-Tra-Phat-Hanh.ps1/.bat` | Thêm verifier chỉ đọc cho git/container/image/migration/HTTP/Cloudflared/metrics | Đã thêm vào master |
| Tài liệu | `README.md`, `PROJECT-OVERVIEW.md`, `VERSION.md`, `CHANGELOG.md`, `web/BAN-GIAO.md`, `docs/OPERATIONS-RUNBOOK.md` | Ghi cùng một quy trình và cùng quy ước origin; cập nhật release r13 | Đã đồng bộ |
| Incident evidence | `checks/recovery-2026-08-24-cloudflare.md` | Ghi trước/sau route change, không ghi token/secret | Đã lưu |
| AI package | `web/prisma/schema.prisma`, hai migration mới, UI/actions/tests governance | Giữ nguyên trong working tree để review; không commit/deploy trong r13 | Blocked/review |

## Quality gate

| Kiểm tra | Kết quả |
|---|---|
| Prisma generate | Pass |
| Prisma validate | Pass |
| TypeScript `tsc --noEmit` | Pass |
| Vitest | 75 file, 396 test passed |
| Next production build | Pass |
| Full ESLint | 0 errors, 6 warnings cũ |
| Docker Compose config | Pass |
| Windows PowerShell parse | 7 script files pass |
| Origin `http://127.0.0.1:3000/login` | HTTP 200 |
| Cloudflared service | Running/Automatic |
| Cloudflared metrics endpoint | HTTP 200 |
| Public HTTPS login | HTTP 200 |

## Commit và phạm vi

| Commit | Phạm vi | Đã push |
|---|---|---|
| `e08d84c` | Operational sync, route convention, scripts, docs vận hành, verifier, lint fixes và incident evidence | `origin/master` |
| `a6dbcfa` | VERSION r13 và CHANGELOG | `origin/master` |

Không chạy Docker build/recreate production sau hai commit này vì máy Windows vẫn có package AI/V2/Training và các artifact local chưa được owner duyệt; image đang chạy tiếp tục được giữ nguyên và public route đã hoạt động.

## Việc còn lại có kiểm soát

Trước lần cập nhật tiếp theo, owner chạy `windows\\Kiem-Tra-Phat-Hanh.bat`. Chỉ chạy `Chay-Zenith.bat` khi working tree sạch; dùng `Sua-Loi.bat` khi cần rebuild/migration sau backup. Không dùng `localhost` làm Cloudflare origin. Package AI chỉ mở lại sau khi bổ sung review quan hệ dữ liệu, approval/audit integration, feature-flag documentation và quality/evidence riêng. Temporary workaround `windows/recovery-force-localhost-ipv4.ps1` vẫn được giữ nguyên, chưa chạy lại và chưa xóa vì cần owner quyết định dọn artifact.
