# ZenithTasks — Red Team Security Audit

**Ngày:** 2026-08-26  
**Baseline:** `master@d1e5adae32debc5117ae3d814f22ae5adaf38b29`  
**Nhánh audit:** `security/red-team-2026-08-26`  
**Phiên bản nội bộ:** `2026.08.24-r16`  
**Trạng thái:** STATIC REVIEW ĐANG CÓ BẰNG CHỨNG; DYNAMIC RED TEAM CHƯA HOÀN TẤT

> Quy ước trạng thái trong báo cáo: **CONFIRMED-STATIC** = source/config chứng minh trực tiếp; **UNCONFIRMED-DYNAMIC** = bằng chứng tĩnh mạnh nhưng cần replay/runtime để xác minh hành vi; **HYPOTHESIS** = cần test mới được gọi là vulnerability. Không có evidence thì không nâng thành finding đã xác minh.

## A. Executive Security Summary

ZenithTasks có nhiều control backend tốt hơn mức trung bình của một ứng dụng nội bộ: phân quyền server-side, ownership theo hồ sơ, private upload storage, token media có chữ ký, transaction/row locking cho tiền và kho, idempotency cho thanh toán, audit bắt buộc ở nhiều mutation quan trọng và webhook signature.

Tuy nhiên **chưa nên cấp security sign-off cho trạng thái hiện tại** trước khi xử lý ít nhất các mục P0/P1 dưới đây:

1. `next@16.3.0` đang thấp hơn bản vá bảo mật `16.3.3` công bố 2026-08-25. Upstream có advisory Critical; exploitability cụ thể trên ZenithTasks vẫn phải retest sau khi nâng cấp.
2. Session JWT có TTL 30 ngày nhưng đổi/reset mật khẩu không có session-version/revocation, tạo cửa sổ cho session bị đánh cắp tiếp tục sống.
3. Các mutation IAM nhạy cảm như thay permission, admin tắt 2FA và active/inactive account chưa có audit bắt buộc đồng đều.
4. Repository hiện public dù tài liệu dự án yêu cầu private; branch `master` chưa được bảo vệ và required status checks đang tắt.
5. Cổng ứng dụng Docker publish `3000:3000` trên mọi interface; nếu kiến trúc chủ đích là chỉ đi qua Cloudflare Tunnel thì đây là đường ingress trực tiếp cần khóa ở host/firewall hoặc loopback bind.

**Không phát hiện bằng chứng tĩnh cho auth bypass/IDOR/financial manipulation đã confirmed trong các luồng đã review.** Nhiều đường rủi ro cao có control đúng và được ghi PASS-STATIC bên dưới. Dynamic differential testing vẫn bắt buộc trước kết luận cuối.

## B. Architecture & Trust Boundary Map

```text
Internet
  ├─ Cloudflare Tunnel
  │    └─ Windows host
  │         └─ Docker: Next.js app (Linux container, :3000)
  │              ├─ Public routes: /login, /dat-lich, /khach/[token]
  │              ├─ Authenticated app: /(app)/**
  │              ├─ Server Actions
  │              ├─ /api/** Route Handlers (không đi qua proxy auth)
  │              ├─ /media/[file]
  │              ├─ private upload volume
  │              └─ Prisma -> PostgreSQL
  └─ Direct host/LAN :3000  [cần khóa nếu không chủ đích]

External trust boundaries:
Next.js -> Zalo OA / Facebook / AI provider / voice provider / Web Push
Public webhook -> signature verification -> conversation ingestion
Customer token -> customer-limited portal -> signed media token
```

## C. Attack Surface Inventory — current static inventory

### Public / tokenized
- `/login`
- `/dat-lich`
- `/khach/[token]`
- `/media/[file]`
- `/api/webhooks/facebook`
- `/api/webhooks/zalo`
- `/api/integrations/zalo/callback` (OAuth callback nhưng code vẫn tự kiểm quyền/state)

### API Route Handlers
- `/api/assistant/transcribe`
- `/api/integrations/zalo/connect`
- `/api/integrations/zalo/callback`
- `/api/notifications/push/subscribe`
- `/api/webhooks/facebook`
- `/api/webhooks/zalo`

### High-value authenticated surfaces
- khách hàng / hồ sơ y khoa / ảnh-file
- lịch hẹn / chăm sóc / inbox
- payment / công nợ / thu-chi / kế toán
- kho / material usage / BOM
- chấm công / lương / hoa hồng
- nhân sự / user / permission / 2FA
- report / export
- AI Admin Gateway / AssistantApproval

## D. Attack Persona Matrix

| Persona | Mục tiêu chính | Static status | Dynamic status |
|---|---|---:|---:|
| Anonymous | public endpoint, booking abuse, secret/config leak | Reviewed một phần | Pending |
| Customer token | A -> B isolation, media access | Strong controls found | Pending |
| Low-priv staff | direct Server Action/API, IDOR/BFLA | Strong controls found in reviewed modules | Pending |
| Fraudulent insider | tiền/kho/lương/chấm công/khách/audit | High-risk modules reviewed một phần | Pending |
| Manager | privilege spillover sang ADMIN | Matrix reviewed một phần | Pending |
| ADMIN compromised | blast radius, re-auth, audit | Gaps found | Pending |
| Stolen session | replay after password reset/change | Strong static evidence | Pending |
| Forged integration | signature/replay/idempotency | Signature controls found | Pending |

## E. Representative Permission Differential Matrix

Đây là policy/enforcement tĩnh suy ra từ `permissions.ts` và các action đã review; chưa thay thế test HTTP/Server Action bằng tài khoản thật.

| Action/Resource | Anonymous | Customer | Reception | Doctor | Consultant | Manager | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Internal app | DENY | DENY | role/cap | role/cap | role/cap | role/cap | role/cap |
| Clinical case write | DENY | DENY | DENY | ALLOW* | ALLOW* | ALLOW* | ALLOW* |
| Add payment | DENY | DENY | ALLOW* | ALLOW* | ALLOW* | ALLOW* | ALLOW* |
| Manage/edit payment | DENY | DENY | DENY | DENY | DENY | ALLOW* | ALLOW* |
| Accounting pay | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW* |
| Accounting close | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW* |
| Customer portal | token only | own token only | N/A | N/A | N/A | N/A | N/A |

`*` còn phụ thuộc module grants/denies, ownership và business invariants.

## F. Vulnerability / Risk Register

| ID | Finding | Severity | Confidence | Status | Priority |
|---|---|---|---|---|---|
| SEC-001 | Next.js 16.3.0 thấp hơn security patch 16.3.3 | CRITICAL upstream / app exploitability conditional | High version / Medium app path | UNCONFIRMED-DYNAMIC | P0 |
| SEC-002 | Password change/reset không thu hồi JWT session cũ | HIGH | High | UNCONFIRMED-DYNAMIC | P0/P1 |
| SEC-003 | Repository public trái với yêu cầu private của dự án | MEDIUM | High | CONFIRMED-STATIC | P1 |
| SEC-004 | `master` không branch protection, required checks off, commit unsigned | MEDIUM | High | CONFIRMED-STATIC | P1 |
| SEC-005 | IAM mutations thiếu audit bắt buộc đồng đều | MEDIUM | High | CONFIRMED-STATIC | P1 |
| SEC-006 | Docker publish app trên mọi interface thay vì loopback-only | MEDIUM conditional | High config / Medium reachability | CONFIRMED-STATIC config | P1/P2 |
| SEC-007 | `xlsx@0.18.5` hiện diện nhưng không tìm thấy import/runtime path | LOW hygiene | Medium | NOT REACHABLE YET | P2 |
| SEC-008 | Zalo webhook ký timestamp nhưng chưa thấy freshness/replay-window check | MEDIUM conditional | Medium | HYPOTHESIS | P1/P2 |
| SEC-009 | OAuth callback origin tin `X-Forwarded-Host/Proto` | MEDIUM conditional | Medium | HYPOTHESIS | P1/P2 |

## G. Detailed Findings

### SEC-001 — Next.js security patch gap

- **Affected component:** `web/package.json`, `web/pnpm-lock.yaml`
- **Observed:** `next = 16.3.0`.
- **Current upstream state (2026-08-25):** security advisories patch in `16.3.3`; one Critical advisory covers Image Optimization/AVIF and one Critical advisory covers Windows-hosted servers.
- **Deployment nuance:** documented production runs Next.js inside a Linux Docker container on a Windows host. Therefore the Windows-filesystem RCE must **not** be claimed exploitable against the documented container deployment without runtime evidence. AVIF/Image Optimization exploitability also needs a reachable optimizer/input path to be demonstrated.
- **Impact if reachable:** unauthenticated RCE at framework layer.
- **Fix:** upgrade `next` + `eslint-config-next` to `16.3.3`, regenerate frozen lockfile, run Prisma generate, TypeScript, full Vitest, lint, production build, then dynamic smoke/retest.
- **Regression:** verify app routes, Server Actions, `/media`, customer portal, image rendering, OAuth/webhooks.

### SEC-002 — Existing JWT survives password change/reset

- **Affected:** `web/src/lib/auth.ts`, `web/src/lib/account-actions.ts`, `web/src/proxy.ts`.
- **Observed:** JWT lifetime 30 days; token has no `jti`/session version; password change/reset updates DB password but does not globally revoke old signed tokens.
- **Attack persona:** stolen authenticated session.
- **Expected:** password change/reset should invalidate pre-existing sessions according to the security test plan.
- **Actual static behavior:** no revocation primitive was found.
- **Impact:** attacker holding a copied valid cookie may remain authenticated until expiry; password reset alone is not sufficient containment.
- **Root cause:** stateless long-lived JWT without server-verifiable session epoch.
- **Recommended fix:** add `sessionVersion`/`authEpoch` to User, embed it in JWT, compare against DB on session resolution, increment on password change/reset and other credential-security events. Consider shorter access TTL plus controlled refresh.
- **Regression test:** token issued before change/reset => DENIED; newly issued token => PASS; disabled user => DENIED; role/grant changes enforced immediately.
- **Status:** UNCONFIRMED-DYNAMIC until replayed in local/test environment.

### SEC-003 — Public repository for sensitive internal application

- **Observed:** GitHub repository visibility is public while project README/security guidance requires the repo to be private.
- **Impact:** exposes complete source, route names, architecture and control assumptions; substantially reduces attacker discovery cost. No secret leak is inferred solely from public visibility.
- **Fix:** make repository private unless public release is intentional; then perform full secret/history scan and rotate any exposed credential found.

### SEC-004 — Weak protected-branch/change-integrity controls

- **Observed:** `master` reports `protected=false`, required status checks off; reviewed HEAD commit is unsigned.
- **Impact:** reduced resistance to accidental/malicious direct changes and CI bypass.
- **Fix:** branch protection/ruleset: PR required, CI required, block force push/deletion, restrict direct pushes, code-owner/review for auth/finance/clinical/security paths; optionally require signed commits.

### SEC-005 — Authorization/security mutations missing required audit

- **Affected:** `web/src/app/(app)/nhan-su/actions.ts`.
- **Observed examples:** `savePermissions`, `adminDisable2FA`, and active-state mutation do not consistently use the same `auditRequired` pattern already used by other high-risk HR mutations.
- **Attack persona:** compromised ADMIN or malicious insider.
- **Impact:** incident response may not reconstruct who changed access/2FA/account state and when; enables repudiation/covering tracks at the application-audit layer.
- **Fix:** wrap security-sensitive IAM mutation + `auditRequired` in one DB transaction; record actor, target, before/after, reason/source where appropriate. Consider re-authentication for 2FA reset/permission escalation.
- **Regression:** mutation succeeds => audit row exists with actor/target/before/after; forced audit failure => mutation fails closed.

### SEC-006 — Direct ingress path around intended Cloudflare edge

- **Affected:** root `docker-compose.yml`.
- **Observed:** `ports: - "3000:3000"` binds container app to host interfaces.
- **Impact:** if Windows firewall/LAN/router allows it, clients can bypass Cloudflare Tunnel controls/rate limiting/WAF and access origin directly.
- **Fix:** if operationally compatible, bind `127.0.0.1:3000:3000` for tunnel-local origin; otherwise explicitly firewall inbound 3000 to trusted networks and document the intended ingress.
- **Status:** config gap confirmed; actual Internet/LAN reachability must be tested from an authorized test network.

## H. PASS-STATIC Controls Already Found

Các mục này **không được báo thành lỗ hổng** khi chưa có evidence ngược lại:

- Login: generic failure, dummy bcrypt, durable rate limiting, TOTP support.
- `/api/assistant/transcribe`: tự kiểm capability, MIME allowlist, size cap và timeout.
- Zalo OAuth: state ngẫu nhiên + state cookie + capability check + token encryption.
- Facebook webhook: HMAC raw-body verification, timing-safe compare.
- Zalo webhook: signature verification, timing-safe compare; inbound externalId có unique/idempotency control.
- Customer portal: token entropy 192-bit khi tạo link, expiry/revoke, customer ownership on mutations.
- Media: private storage, basename restriction, HMAC signed ticket, expiry, case/customer scoping; clinical photo denied to portal ticket.
- Payment: positive amount/business invariant, row lock/transaction, overpayment guard, idempotency nonce.
- Inventory/material: row locks, transaction, negative-stock guard, restoration/audit flows.
- High-risk clinical/finance writes reviewed: server-side capability + ownership + transaction/audit patterns exist.

Dynamic tests vẫn phải chứng minh các control này hoạt động đúng khi request bị sửa trực tiếp.

## I. 20 High-Risk Attack Hypotheses for Dynamic Test

1. Replay JWT cũ sau self password change.
2. Replay JWT cũ sau ADMIN password reset.
3. Old JWT with stale `mustChangePassword` claim bypasses forced-change flow.
4. Anonymous call to every `/api/**` route; verify 401/403/signature behavior.
5. Permission differential: RECEPTION/TELESALE directly invoke ADMIN Server Actions.
6. Horizontal IDOR: case/customer A ID swapped to B.
7. Customer portal token A attempts appointment/media belonging to B.
8. Expired/revoked portal token replay.
9. Signed media ticket swapped to another filename/category; clinical image from portal.
10. Direct `/uploads/*` attempt without valid session.
11. Harmless fake-MIME/double-extension/Unicode/path-traversal upload marker.
12. Hidden field/mass-assignment attempts against customer/payment/HR forms.
13. Concurrent duplicate payment with same and different nonce.
14. Concurrent stock deduction / duplicate BOM issue.
15. Backdate or post-close finance mutation.
16. Manager edits own attendance/payroll-related data; assess separation-of-duties policy.
17. Permission change/2FA reset/account disable: verify audit + session containment.
18. Zalo valid webhook replay with old timestamp and duplicate event ID.
19. OAuth connect/callback under forged `X-Forwarded-Host/Proto` in mock/local proxy.
20. Low-privilege user asks AI to execute ADMIN-only clinical/finance/permission action; backend/tool layer must deny.

## J. Fraud Tree

```text
Insider muốn trục lợi
├─ Chiếm khách / đổi owner
├─ Sửa doanh thu / payment / công nợ
├─ Thay commission / payroll / attendance
├─ Tạo khoản chi hoặc chứng từ giả
├─ Sửa/xuất tồn kho
├─ Trộm/export dữ liệu khách
├─ Sửa/xóa lịch sử y khoa/ảnh
├─ Cấp quyền / tắt 2FA / duy trì session
└─ Che giấu hành động
   ├─ thiếu audit IAM
   ├─ sửa trước/after không đủ
   └─ lợi dụng account/session bị chiếm
```

## K. Attack Chains to Retest

Các chuỗi sau hiện là **HYPOTHESIS**, không phải exploit đã confirmed:

- Stolen session -> ADMIN resets password -> old session remains valid -> attacker continues privileged actions -> missing IAM audit reduces forensic visibility.
- Low-priv role -> IDOR/BFLA attempt -> customer/media token acquisition -> cross-customer data exposure. Reviewed controls đang chặn về mặt tĩnh; cần differential runtime test để đóng giả thuyết.
- Direct origin `:3000` -> bypass edge protections -> exercise public webhook/booking/login endpoints at origin -> amplify rate-limit/header differences if any.

## L. Remediation Backlog

| Priority | Security ID | Task | Files/Control | Test required | Status |
|---|---|---|---|---|---|
| P0 | SEC-001 | Upgrade Next.js to 16.3.3 and regenerate lock | package + lock | typecheck/test/lint/build + dynamic | OPEN |
| P0/P1 | SEC-002 | Implement server-verifiable session epoch/revocation | Prisma/auth/account actions/proxy | old-token replay regression | OPEN |
| P1 | SEC-003 | Make repo private + history secret scan | GitHub settings/history | verify visibility + secret rotation if hit | OPEN |
| P1 | SEC-004 | Protect master and require CI | GitHub ruleset | negative direct-push test | OPEN |
| P1 | SEC-005 | Audit IAM/security mutations fail-closed | nhan-su actions/audit | audit existence + fail-closed | OPEN |
| P1/P2 | SEC-006 | Restrict origin port or firewall explicitly | docker-compose/Windows firewall | authorized network reachability | OPEN |
| P1/P2 | SEC-008 | Add/verify webhook replay window | Zalo webhook/channel | old timestamp/replay | HYPOTHESIS |
| P1/P2 | SEC-009 | Derive OAuth origin from trusted configured origin | request-origin/OAuth | forged forwarded headers | HYPOTHESIS |
| P2 | SEC-007 | Remove unused `xlsx` dependency if truly unused | package + lock | typecheck/test/build | OPEN |
| P2 | CI | Add SCA, secret scan, lint, production build security gates | workflow | PR gate test | OPEN |

## M. Dynamic Testing / Retest Status

Dynamic execution is **not complete in this audit snapshot**. The current execution environment could read/write GitHub but could not establish a local clone/runtime through its network path, so no exploit has been marked CLOSED or CONFIRMED based only on source appearance.

Required before final closure:

```text
baseline tests
-> local/test DB + fake accounts/data
-> permission differential tests
-> auth/session replay tests
-> portal/media isolation
-> webhook/OAuth mock tests
-> harmless upload tests
-> finance/inventory concurrency tests
-> AI permission-bypass tests
-> patch P0/P1
-> regression tests
-> repeat original attacks
-> legitimate workflows still pass
-> adversarial second pass
```

## N. Completion Criteria Status

- Attack surface inventory: **PARTIAL, high-value routes inventoried**
- Public/API review: **PARTIAL**
- Server Actions sensitive review: **PARTIAL, finance/clinical/inventory/HR sampled deeply**
- Permission matrix: **PARTIAL static**
- Authentication/session: **STATIC REVIEW DONE; DYNAMIC PENDING**
- Customer-token/media isolation: **STATIC PASS; DYNAMIC PENDING**
- Upload: **STATIC REVIEW PARTIAL; DYNAMIC PENDING**
- Webhook/OAuth: **STATIC REVIEW DONE for main handlers; DYNAMIC PENDING**
- Fraud/business logic: **STATIC REVIEW PARTIAL; concurrency runtime pending**
- Dependencies/config: **CURRENT review performed 2026-08-26**
- Audit logging: **gap confirmed in IAM mutations**
- P0/P1 patch plan: **CREATED**
- Regression/retest/red-team round 2: **PENDING**

**Kết luận hiện tại:** mức bảo đảm mới là static/security-architecture review có bằng chứng. Không tuyên bố ZenithTasks “an toàn tuyệt đối”, không tuyên bố exploit đã được vá khi chưa chạy lại testcase. Final security sign-off chỉ được đưa ra sau dynamic retest P0/P1 và adversarial review vòng 2.
