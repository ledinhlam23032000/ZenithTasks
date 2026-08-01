# Project Overview — Clinic Management Web App
### Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc

> Tài liệu này giúp một **lập trình viên hoặc AI khác** đọc và hiểu nhanh toàn bộ dự án:
> mục đích, công nghệ, kiến trúc, mô hình dữ liệu, các luồng nghiệp vụ và cách chạy.
> (For an external reviewer / AI: this is the entry point to understand the whole codebase.)

---

## 1. What this is / Dự án là gì
An **internal management web app for a cosmetic-surgery clinic**. It runs on **one "server" PC**
at the clinic (Docker) holding all data; staff connect from any device via browser/PWA over the
LAN or Internet (Cloudflare Tunnel). Single codebase, Vietnamese UI.

Core business needs it covers:
1. Appointments & telesale booking (Lịch hẹn, Đặt lịch online).
2. Reception: look up customer by **last 5 phone digits**, open/append a treatment record (Tiếp nhận).
3. Customer + treatment records merged into one (Hồ sơ khách hàng): services, discounts, voucher, payments, debt.
4. Materials usage, before/after photos, follow-ups.
5. Customer care log (Chăm sóc KH) + optional AI message drafting (Claude API).
6. Reports & analytics, staff performance, collaborators (Báo cáo, Hiệu suất nhân sự, Cộng tác viên).
7. Strict access control; **customer phone numbers are AES-256 encrypted** and only ADMIN/MANAGER can reveal the full number.

---

## 2. Tech stack
- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **PostgreSQL** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- Auth: **JWT** (`jose`) in an httpOnly cookie + **bcryptjs** (cost 12); optional **TOTP 2FA** (hand-rolled, RFC 6238)
- Charts: **recharts**. Tests: **vitest**. CI: GitHub Actions.
- Deploy: **Docker Compose** (app + Postgres). ~60k LOC TS/TSX, 19 Prisma models, 18 migrations.

> ⚠️ **This Next.js has breaking changes vs older versions** (App Router, async `params`/`searchParams`,
> server actions). See `web/AGENTS.md`. Don't assume older Next.js APIs.

---

## 3. Quick start / Cách chạy

**Dev (local):**
```bash
cd web
cp .env.example .env          # set DATABASE_URL, AUTH_SECRET, PHONE_ENC_KEY
npm install
npm run db:deploy             # apply migrations  (or db:migrate in dev)
npm run db:seed               # demo data (admin / 123456)
npm run dev                   # http://localhost:3000
```

**Everything via Docker (1 command):**
```bash
docker compose up --build     # app + postgres; open http://localhost:3000
```
The container entrypoint (`web/docker-entrypoint.sh`) waits for DB, runs `prisma migrate deploy`,
seeds if the User table is empty, then starts the app. `AUTH_SECRET` is auto-generated into a volume
if not provided.

**Verify the code:**
```bash
cd web
npx tsc --noEmit              # typecheck (fast)
npx vitest run               # unit tests (lib/__tests__)
```
(`next build` is RAM-heavy; `tsc` is the quick correctness check.)

**Windows non-technical deploy:** the `windows/` folder has clickable `.bat` files
(`Chay-Zenith.bat` = install/update, `Mo-App.bat` = open, `Sua-Loi.bat` = clean rebuild,
`Xem-Loi.bat` = dump logs). These pull from GitHub + run Docker.

---

## 4. Repository map
```
/
├─ web/                         ← the application (everything important is here)
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ (app)/              ← authenticated area (sidebar layout)
│  │  │  │   dashboard, lich-hen, tiep-nhan, khach-hang, ho-so, cham-soc,
│  │  │  │   bao-cao, hieu-suat, cong-tac-vien, luong, thu-chi, cham-cong,
│  │  │  │   lich-lam-viec, danh-muc, kho, nhan-su, nhat-ky, tai-khoan
│  │  │  ├─ login, dat-lich (public booking), khach/[token] (public portal)
│  │  │  ├─ layout.tsx, globals.css, error.tsx, not-found.tsx
│  │  ├─ lib/                   ← business logic & helpers (see §6)
│  │  ├─ components/ (ui/, charts/, layout/)
│  │  └─ generated/prisma/      ← generated Prisma client (regenerated, not edited)
│  ├─ prisma/ (schema.prisma, migrations/, seed.ts)
│  ├─ Dockerfile, docker-entrypoint.sh, docker-compose.yml
│  ├─ DU-AN.md                  ← detailed Vietnamese handoff log (deep context)
│  └─ AGENTS.md                 ← Next.js-16 caveats
├─ windows/                     ← clickable .bat/.ps1 deploy scripts for the clinic PC
├─ client/                      ← small companion app for sub-machines
├─ deploy/                      ← VPS docker-compose (with Caddy)
└─ docker-compose.yml           ← home-server compose (app + db)
```

---

## 5. Architecture & key conventions

- **Routing**: Next.js App Router. The `(app)` route group is the authenticated area with a shared
  sidebar (`components/layout/app-shell.tsx`). Public pages: `/login`, `/dat-lich` (online booking),
  `/khach/[token]` (read-only customer portal). `proxy.ts` (Next 16 middleware) allows the public paths.
- **Data fetching**: Server Components query Prisma directly. Pages are mostly `export const dynamic = "force-dynamic"`.
- **Mutations**: **Server Actions** (`"use server"`) in `actions.ts` files per module. Forms use
  `useActionState`; delete/confirm buttons call actions via `useTransition` + `router.refresh()`
  (pattern: `components/ui/delete-button.tsx`, `confirm-button.tsx`).
- **Auth**: `lib/auth.ts` — `getCurrentUser()`, `requireUser(roles?)`, `requireCap(key)`.
  Session = JWT cookie `zsession`, 30-day expiry.
- **Authorization (RBAC)**: `lib/permissions.ts` is the single source of truth.
  - `MODULES` = pages/menu (key `mod:<x>`), `CAPABILITIES` = fine-grained (`case.clinical`,
    `payment.add`, `payment.manage`, `phone.full`). Each has default roles.
  - Per-user overrides stored in `User.permissions` JSON `{ grant:[], deny:[] }`.
  - Effective permission = (role defaults ∪ grant) − deny → `userCan(user, key)`.
  - Pages call `requireCap("mod:<x>")`; the sidebar uses `navForUser(user)`.
  - Roles (`Role` enum): ADMIN, MANAGER, TELESALE, RECEPTION, CONSULTANT, DOCTOR, NURSE, CARE, SHAREHOLDER (view-only investor).
- **Money**: stored as `Decimal(14,0)` (VND, no decimals). UI uses `MoneyInput` (thousands separators)
  and `formatVND` (`lib/money.ts`).
- **Timezone**: container TZ = Asia/Ho_Chi_Minh. Attendance day uses `vnDateOnly()` (`lib/dates.ts`).

---

## 6. Important `lib/` files (start here to understand logic)
| File | Purpose |
|------|---------|
| `auth.ts` | Session, `requireUser`, `requireCap` |
| `permissions.ts` | RBAC modules + capabilities + `userCan`, `navForUser` |
| `rbac.ts` | Role labels + `isManagerial`, `isShareholder` |
| `db.ts` | Lazy Prisma client (Proxy) — build doesn't need DATABASE_URL |
| `phone.ts` | AES-256-GCM encrypt/decrypt, `maskPhone`, `phoneLast5`, `hashPhone` |
| `codes.ts` / `seq.ts` | Generate non-colliding codes (KH/HS = **max existing + 1**, with retry) |
| `money.ts` / `format.ts` / `dates.ts` | Formatting helpers |
| `dashboard.ts` / `reports.ts` / `performance.ts` | Aggregations for Tổng quan / Báo cáo / Hiệu suất + CTV |
| `payroll.ts` | Salary by attendance days + manual commission/bonus |
| `finance.ts` | Cashbook income/expense categories |
| `loyalty.ts` | Membership tiers + points from lifetime spend |
| `audit.ts` | Fire-and-forget audit log writer |
| `ai.ts` | Claude API call for drafting care messages (optional, needs key) |
| `xlsx.ts` / `export.ts` | Dependency-free .xlsx writer + Excel/Word/CSV responses |
| `totp.ts` / `rate-limit.ts` | 2FA + login brute-force protection |

---

## 7. Data model (Prisma, 19 models)
- **People/HR**: `User` (staff + HR fields + role + permissions), `Attendance`, `PayrollEntry`, `Shift`.
- **Customers**: `Customer` (phone encrypted; `source`, `sourceDetail`=CTV name), `Collaborator` (CTV profile),
  `Appointment`, `CareMessage`, `FollowUp`, `Photo`.
- **Treatment**: `CaseRecord` (hồ sơ điều trị: totals, paid, debt, voucher, commission, status, consultant/doctor),
  `CaseService` (listPrice giá niêm yết + unitPrice giá ưu đãi + discount + finalPrice), `Payment`, `MaterialUsage`.
- **Catalog/Inventory**: `Service` (listPrice + defaultPrice), `Material`, `StockMovement`.
- **Ops**: `CashTransaction` (cashbook), `AuditLog`.

Money math (`lib/.../ho-so/actions.ts recalc()`): `totalAmount = Σ finalPrice − voucher (net)`;
`debt = net − paid`. Commission is **entered manually** (no % auto-calc).

---

## 8. Feature modules (the `(app)` routes)
- **dashboard** — KPIs, today's schedule, recent care, revenue chart.
- **lich-hen** — appointments (create/edit/status); **dat-lich** = public self-booking.
- **tiep-nhan** — reception: search by last-5, create customer, open case.
- **khach-hang** — merged customer + treatment records; status filter (done/not-done service); membership tier; phone reveal (audited).
- **ho-so/[id]** — the treatment record: services, materials, photos, payments, voucher, follow-ups, printable invoice (`/hoa-don`).
- **cham-soc** — customer care messages (+ AI draft).
- **bao-cao** — analytics: revenue, close rate, P&L, top services, consultant/doctor performance, sources; multi-type charts; export.
- **hieu-suat** + **cong-tac-vien** — staff performance & collaborator performance (drill into individual cases; charts; export).
- **luong** — payroll (base by attendance + manual commission/bonus) with performance column.
- **thu-chi** — operational cashbook (income/expense). Revenue & P&L live in Báo cáo (not here).
- **cham-cong** — attendance (admin can edit past days), **lich-lam-viec** — shift schedule.
- **danh-muc** — service & material catalog (two-tier pricing + search), **kho** — inventory with low-stock/expiry alerts.
- **nhan-su** — staff management (HR profiles, role change, permission editor, reset password, 2FA disable).
- **nhat-ky** — audit log viewer. **tai-khoan** — self profile/password/2FA.

---

## 9. Security model (important)
- **Customer phone**: AES-256-GCM encrypted at rest (`phoneEnc`); only `phoneLast5` shown to most staff.
  Full number revealed only to `phone.full` (ADMIN/MANAGER) via the `revealPhone` server action,
  which writes a `REVEAL_PHONE` audit log. Never decrypted on passive render.
- **Secrets**: `AUTH_SECRET` auto-generated per machine into a Docker volume (not in Git).
  `PHONE_ENC_KEY` — see security note below.
- **Hardening**: bcrypt cost 12, 8-char min password, login rate-limit, security headers in `next.config.ts`,
  honeypot + rate-limit on public booking, audit log for sensitive actions.

> 🔒 **SECURITY NOTE for the reviewer**: keep this package private.
> - `web/docker-entrypoint.sh` ships a **demo fallback `PHONE_ENC_KEY`** (used only if none is set via `.env`).
>   For real production it must be replaced and data re-encrypted (`prisma/rotate-phone-key.ts`).
> - The seed creates a default admin **`admin` / `123456`** — change immediately in production.
> - No real customer data is in this package (data lives only in the clinic's database).

---

## 10. Where to start reading (suggested order)
1. `web/prisma/schema.prisma` — the data model (the whole domain in one file).
2. `web/src/lib/permissions.ts` + `web/src/lib/auth.ts` — how access works.
3. `web/src/app/(app)/layout.tsx` + `components/layout/app-shell.tsx` — the shell/nav.
4. `web/src/app/(app)/ho-so/[id]/page.tsx` + `ho-so/actions.ts` — the richest feature (treatment record + money math).
5. `web/src/app/(app)/khach-hang/[id]/page.tsx` — customer profile.
6. `web/src/lib/dashboard.ts` / `reports.ts` / `performance.ts` — analytics.
7. `web/DU-AN.md` — long Vietnamese changelog/handoff with deep rationale for most decisions.

---

*Generated as a review package. Author/owner: GĐĐH — BS. Lê Đình Lam · 0941 567 496.*

## Omnichannel customer-care inbox

ZenithTasks now includes a first-party Zalo OA and Facebook Page inbox. New provider events are normalized into a separate inbox domain with OAuth tokens encrypted at rest, signed/idempotent webhooks, assignment queues, response lifecycle, protected attachments, maintenance jobs and audit events. `CareMessage` remains the unchanged legacy/manual log. `OMNICHANNEL_ENABLED=false` is the safe default; real activation still requires the owner to configure provider apps, complete provider review where applicable, and pass one real receive/reply smoke test per channel.
