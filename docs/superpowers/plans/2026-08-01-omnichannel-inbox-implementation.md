# Omnichannel Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nhận tin nhắn mới từ Zalo OA và Facebook Fanpage, phân công xử lý và trả lời trực tiếp trong ZenithTasks mà vẫn giữ nguyên nhật ký `CareMessage` cũ.

**Architecture:** Thêm domain inbox độc lập trên PostgreSQL, chuẩn hóa hai nhà cung cấp sau interface chung và dùng Route Handlers cho OAuth/webhook. `/cham-soc` đọc domain mới khi cờ tính năng bật, còn nhật ký thủ công tiếp tục dùng `CareMessage`; token được mã hóa phía server và thao tác nhạy cảm đi qua RBAC/audit.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript strict, Prisma 7.8/PostgreSQL 16, Zod 4, Vitest 2.1.9, Docker Compose, Meta Graph API v24.0, Zalo OA OAuth v4/OpenAPI v3.

## Global Constraints

- Chỉ nhận sự kiện phát sinh sau `ChannelAccount.connectedAt`; không gọi API nhập lịch sử.
- Chỉ ADMIN/MANAGER/CARE dùng inbox; SHAREHOLDER bị hard-deny mọi key `inbox.*` kể cả khi có grant.
- `CareMessage` không bị xóa, đổi hay ghi lặp; tab `Nhật ký thủ công` tiếp tục dùng dữ liệu cũ.
- `OMNICHANNEL_ENABLED=false` là mặc định; bật nhưng chưa có kênh thì hiện onboarding.
- Token/verifier dùng AES-256-GCM với `CHANNEL_TOKEN_ENC_KEY`; secret không ra client, audit hoặc log.
- Webhook xác thực raw body, idempotent và trả response trong tối đa 5 giây; không gọi AI.
- Poll 5 giây khi tab visible, dừng khi hidden và refresh ngay khi focus.
- Payload webhook sạch giữ tối đa 7 ngày; receipt ID/hash/status/lỗi sạch giữ lâu dài.
- Không broadcast, workflow builder hoặc AI tự gửi trong giai đoạn đầu.
- Mỗi hành vi mới theo RED → GREEN → REFACTOR; mỗi task commit tiếng Việt và push `origin/master` sau verification.
- Không bật production nếu OAuth permission, webhook verify và send/receive smoke test thật chưa đạt.

## File Map

- `web/prisma/schema.prisma` và migration mới: domain inbox/OAuth/webhook/attachment.
- `web/src/lib/permissions.ts`: capability inbox và hard deny SHAREHOLDER.
- `web/src/lib/channels/`: crypto, signature, provider adapters, ingestion, token và nghiệp vụ inbox.
- `web/src/app/api/channels/`: OAuth callback, webhook và attachment Route Handlers.
- `web/src/app/(app)/cham-soc/`: inbox, cài đặt kênh và tab nhật ký cũ.
- Cấu hình gốc/web, Docker, Windows và tài liệu: secrets, scheduler, deployment, rollback, nhật ký.

## Execution Order

Thực thi theo số task, không theo vị trí hiển thị: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11**. Task 2–3 tạo schema/crypto mà Task 4–7 tiêu thụ.

---

### Task 1: Reproducible baseline and master operations

**Files:**
- Create: `scripts/New-Test-BuildContext.ps1`
- Create: `scripts/New-Test-BuildContext.Tests.ps1`
- Modify: `windows/Sua-Loi.ps1`
- Modify: `windows/Zenith-Setup.ps1`
- Modify: `deploy/cai-dat-vps.sh`
- Modify: `deploy/HUONG-DAN-VPS.md`

**Interfaces:**
- Produces `New-Test-BuildContext.ps1 -Destination <absolute-path>` exporting only tracked files outside OneDrive.

- [x] **Step 1: Write failing behavior test**

```powershell
$out = Join-Path $env:TEMP ("zenith-export-" + [guid]::NewGuid())
& "$PSScriptRoot/New-Test-BuildContext.ps1" -Destination $out
if (-not (Test-Path (Join-Path $out "web/package-lock.json"))) { throw "missing lockfile" }
if (Test-Path (Join-Path $out "web/node_modules")) { throw "node_modules leaked" }
```

- [x] **Step 2: Verify RED**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/New-Test-BuildContext.Tests.ps1`

Expected: FAIL because export script does not exist.

- [x] **Step 3: Implement export and master references**

```powershell
param([Parameter(Mandatory=$true)][string]$Destination)
if (Test-Path -LiteralPath $Destination) { throw "Destination already exists" }
New-Item -ItemType Directory -Path $Destination | Out-Null
$zip = Join-Path ([IO.Path]::GetTempPath()) ("zenith-" + [guid]::NewGuid() + ".zip")
git archive --format=zip --output=$zip HEAD
if ($LASTEXITCODE -ne 0) { throw "git archive failed" }
Expand-Archive -LiteralPath $zip -DestinationPath $Destination
Remove-Item -LiteralPath $zip -Force
```

Replace every updater branch/raw GitHub URL in the listed files with `master`.

- [x] **Step 4: Verify GREEN and current baseline**

Run the PowerShell test, export to a fresh path, then:

```powershell
docker build --target build -t zenithtasks-baseline:<short-sha> <temp>\web
docker run --rm --entrypoint npm zenithtasks-baseline:<short-sha> test
```

Expected: script pass, build exit 0, all current tests pass. If build cannot finish, stop before schema work and report the environment blocker.

- [x] **Step 5: Commit**

```powershell
git add -- scripts windows/Sua-Loi.ps1 windows/Zenith-Setup.ps1 deploy/cai-dat-vps.sh deploy/HUONG-DAN-VPS.md
git commit -m "chore: chuẩn hóa build kiểm thử và nhánh master"
git push origin master
```

### Task 4: Provider contract, normalization and outbound text

**Files:**
- Create: `web/src/lib/channels/types.ts`
- Create: `web/src/lib/channels/providers/meta.ts`
- Create: `web/src/lib/channels/providers/zalo.ts`
- Create: `web/src/lib/channels/provider.ts`
- Create: `web/src/lib/channels/__tests__/meta-provider.test.ts`
- Create: `web/src/lib/channels/__tests__/zalo-provider.test.ts`

**Interfaces:**
- `NormalizedChannelEvent` union: `message.received`, `message.delivered`, `message.read`, `contact.withdrawn`.
- `ChannelProviderAdapter`: authorization URL, code exchange, refresh, normalize, send text, upload/send attachment, account/contact profile, health check.
- `sendText` returns provider message ID/timestamp or throws `ChannelProviderError` containing clean public message and retry/reauth flags.

- [x] **Step 1: Write failing normalizer tests**

```typescript
expect(normalizeMetaWebhook(metaFixture)).toEqual([{
  kind: "message.received",
  provider: "FACEBOOK_PAGE",
  externalAccountId: "page-1",
  externalUserId: "psid-9",
  externalThreadId: "psid-9",
  providerMessageId: "mid.123",
  timestamp: new Date(1722500000000),
  message: { type: "TEXT", text: "Xin chào", attachments: [] },
}]);
```

Zalo fixture maps `user_send_text` fields `oa_id`, `sender.id`, `message.msg_id`, `message.text`, `timestamp`. Add image/file/sticker literals and assert unknown valid events return `[]`.

- [x] **Step 2: Verify RED**

Run both provider tests. Expected: FAIL because providers do not exist.

- [x] **Step 3: Implement adapters**

Meta POSTs `https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}/messages` with Page bearer token:

```json
{"recipient":{"id":"<PSID>"},"messaging_type":"RESPONSE","message":{"text":"<content>"}}
```

Zalo POSTs `https://openapi.zalo.me/v3.0/oa/message/cs` with `access_token` header:

```json
{"recipient":{"user_id":"<UID>"},"message":{"text":"<content>"}}
```

Inject `fetch`; map 401/token errors to reauth, 429 to retryable and never put raw token-bearing bodies into public errors. Meta uploads multipart to `/${pageId}/message_attachments` and sends its `attachment_id`; Zalo uploads to `/v2.0/oa/upload/image` or `/v2.0/oa/upload/file` and sends the returned attachment ID through the consultation-message endpoint. Tests cover JPEG/PDF request shapes with literal responses.

- [x] **Step 4: Verify GREEN**

Run focused and all tests. Expected: text/image/file/sticker normalization and error mapping pass against complete provider response fixtures.

- [x] **Step 5: Commit**

```powershell
git add -- web/src/lib/channels
git commit -m "feat: chuẩn hóa kết nối Meta và Zalo OA"
git push origin master
```

### Task 5: Idempotent ingestion and webhook routes

**Files:**
- Create: `web/src/lib/channels/ingest.ts`
- Create: `web/src/lib/channels/__tests__/ingest.test.ts`
- Create: `web/src/app/api/channels/meta/webhook/route.ts`
- Create: `web/src/app/api/channels/zalo/webhook/route.ts`

**Interfaces:**
- `ingestChannelEvent(store, event, receipt): Promise<{ duplicate; conversationId? }>`.
- Route sequence: raw body → signature → parse → normalize → transactional ingest → 200.

- [x] **Step 1: Write failing ingestion tests**

```typescript
it("stores a repeated provider message once", async () => {
  const first = await ingestChannelEvent(store, inboundText, receipt);
  const second = await ingestChannelEvent(store, inboundText, receipt);
  expect(first.duplicate).toBe(false);
  expect(second.duplicate).toBe(true);
  expect(store.messages).toHaveLength(1);
  expect(store.conversations).toHaveLength(1);
});
```

Also assert pre-`connectedAt` event ignored, inbound after `CLOSED` creates a new cycle, unread increments only inbound, and `contact.withdrawn` removes provider identity/profile fields while retaining only the minimum audit receipt.

- [x] **Step 2: Verify RED**

Run focused ingestion test. Expected: FAIL because service does not exist.

- [x] **Step 3: Implement transaction and routes**

Create receipt first inside `$transaction`; unique conflict returns duplicate. Upsert contact/thread, find/create active conversation, insert message, update preview/unread, mark receipt `PROCESSED`. Meta GET returns `hub.challenge` only for matching `META_WEBHOOK_VERIFY_TOKEN` using timing-safe compare. Bad signature returns 401, bad JSON 400, unknown signed event 200.

- [x] **Step 4: Verify GREEN**

Run focused/all tests and direct `Request` fixtures against handlers. Expected: duplicate request returns 200 while row counts remain one.

- [x] **Step 5: Commit**

```powershell
git add -- web/src/lib/channels/ingest.ts web/src/lib/channels/__tests__/ingest.test.ts web/src/app/api/channels
git commit -m "feat: nhận webhook Zalo và Facebook chống trùng"
git push origin master
```

### Task 6: Admin OAuth connection and settings

**Files:**
- Create: `web/src/lib/channels/connect.ts`
- Create: `web/src/lib/channels/__tests__/connect.test.ts`
- Create: `web/src/app/api/channels/zalo/connect/route.ts`
- Create: `web/src/app/api/channels/zalo/callback/route.ts`
- Create: `web/src/app/api/channels/meta/connect/route.ts`
- Create: `web/src/app/api/channels/meta/callback/route.ts`
- Create: `web/src/app/(app)/cham-soc/cai-dat/page.tsx`
- Create: `web/src/app/(app)/cham-soc/cai-dat/channel-cards.tsx`

**Interfaces:**
- `beginChannelOAuth(provider, actorId, origin): Promise<URL>`.
- `completeChannelOAuth(provider, callbackUrl, actorId): Promise<ChannelAccount>`.
- OAuth attempt is one-use, expires after 10 minutes, stores only state hash and encrypted verifier.

- [x] **Step 1: Write failing replay/expiry tests**

```typescript
it("consumes state once", async () => {
  const attempt = await beginOAuthAttempt(store, "ZALO_OA", "admin-1", now);
  expect(await consumeOAuthAttempt(store, attempt.state, now)).toMatchObject({ provider: "ZALO_OA" });
  await expect(consumeOAuthAttempt(store, attempt.state, now)).rejects.toThrow("Liên kết đã được sử dụng");
});
```

Test expiry at 10 minutes and exact Meta Page selection: `META_PAGE_ID` must match an accessible Page; no match stores no Page token and returns names/IDs only.

- [x] **Step 2: Verify RED**

Run focused connect test. Expected: FAIL because service does not exist.

- [x] **Step 3: Implement OAuth and settings**

All routes call `requireCap("inbox.manageChannels")`. Zalo uses `https://oauth.zaloapp.com/v4/oa/permission` plus PKCE, then `/v4/oa/access_token` with `secret_key`. Meta requests `pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement`, resolves exact Page and subscribes `messages,messaging_postbacks,message_deliveries,message_reads`. Encrypt tokens before insert. Cards show status, last webhook/health and clean error; never token fields. ADMIN may leave response target disabled or save a positive minute value into `responseTargetMinutes`.

- [x] **Step 4: Verify GREEN**

Run focused/all tests and render fixture. Expected: replay/expiry rejected, exact account upserted, `CHANNEL_CONNECT`/`CHANNEL_DISCONNECT` audited, token absent from HTML.

- [x] **Step 5: Commit**

```powershell
git add -- web/src/lib/channels/connect.ts web/src/lib/channels/__tests__/connect.test.ts web/src/app/api/channels web/src/app/'(app)'/cham-soc/cai-dat
git commit -m "feat: kết nối Zalo OA và Fanpage bằng đăng nhập quản trị"
git push origin master
```

### Task 7: Token rotation, health and retention maintenance

**Files:**
- Create: `web/src/lib/channels/token-manager.ts`
- Create: `web/src/lib/channels/maintenance.ts`
- Create: `web/src/lib/channels/__tests__/token-manager.test.ts`
- Create: `web/src/lib/channels/__tests__/maintenance.test.ts`
- Create: `web/src/app/api/internal/channels/maintenance/route.ts`

**Interfaces:**
- `withValidAccessToken(accountId, operation): Promise<T>`.
- `runChannelMaintenance(now): Promise<{ checked; refreshed; degraded; payloadsPurged }>`.

- [x] **Step 1: Write failing rotation tests**

```typescript
it("persists new one-time refresh token atomically", async () => {
  const result = await refreshUnderLock(store, zaloAccount, provider, now);
  expect(result.accessToken).toBe("access-new");
  expect(store.saved.refreshToken).toBe("refresh-new");
  expect(store.saved.refreshToken).not.toBe("refresh-old");
});
```

Add concurrent refresh-once, 7-day sanitized-payload purge and isolated provider-degradation tests.

- [x] **Step 2: Verify RED**

Run both maintenance test files. Expected: FAIL because modules do not exist.

- [x] **Step 3: Implement lock and internal route**

Within a transaction run `SELECT pg_advisory_xact_lock(hashtext(${`channel:${accountId}`}))`, reload, refresh if expiring in two hours, persist both new encrypted tokens. Endpoint accepts only timing-safe `Authorization: Bearer <CHANNEL_MAINTENANCE_SECRET>`, rate-limits wrong attempts and returns counts only.

- [x] **Step 4: Verify GREEN**

Run focused/all tests and wrong/missing/correct bearer requests. Expected statuses: 401, 401, 200; response contains no secret.

- [x] **Step 5: Commit**

```powershell
git add -- web/src/lib/channels web/src/app/api/internal/channels
git commit -m "feat: tự gia hạn token và giám sát kết nối kênh"
git push origin master
```

### Task 2: Inbox schema and authorization boundary

**Files:**
- Modify: `web/prisma/schema.prisma`
- Create: `web/prisma/migrations/20260801090000_omnichannel_inbox/migration.sql`
- Modify: `web/src/lib/permissions.ts`
- Modify: `web/src/lib/__tests__/permissions.test.ts`

**Interfaces:**
- Produces enums/models `ChannelAccount`, `ChannelContact`, `ChannelThread`, `Conversation`, `InboxMessage`, `ConversationEvent`, `ConversationPresence`, `WebhookReceipt`, `OAuthAttempt`, `InboxAttachment`.
- Produces keys `inbox.view`, `inbox.viewAll`, `inbox.reply`, `inbox.assign`, `inbox.linkCustomer`, `inbox.manageChannels`.

- [x] **Step 1: Write failing permission tests**

```typescript
it("hard-deny SHAREHOLDER dù được grant", () => {
  const user = { role: "SHAREHOLDER" as const, permissions: { grant: ["inbox.view", "inbox.reply"], deny: [] } };
  expect(userCan(user, "inbox.view")).toBe(false);
  expect(userCan(user, "inbox.reply")).toBe(false);
});

it("cấp inbox đúng vai trò", () => {
  expect(userCan({ role: "CARE" }, "inbox.reply")).toBe(true);
  expect(userCan({ role: "CARE" }, "inbox.manageChannels")).toBe(false);
  expect(userCan({ role: "ADMIN" }, "inbox.manageChannels")).toBe(true);
});
```

- [x] **Step 2: Verify RED**

Run: `npm test -- src/lib/__tests__/permissions.test.ts`

Expected: FAIL because inbox keys and hard deny do not exist.

- [x] **Step 3: Implement permissions and additive schema**

Add six capabilities; `userCan` checks `role === "SHAREHOLDER" && key.startsWith("inbox.")` before grant evaluation. `ChannelAccount` is unique on provider/external ID and stores encrypted tokens, nullable `responseTargetMinutes`, and health timestamps. `InboxMessage` includes account/conversation/provider ID/client nonce/direction/type/status/content/attachment/error/provider timestamp. `WebhookReceipt` is unique on provider/account/event key. Relations to `User`/`Customer` use `SET NULL`; `CareMessage` remains byte-for-byte unchanged.

Migration adds this partial index:

```sql
CREATE UNIQUE INDEX "Conversation_one_active_per_thread"
ON "Conversation"("threadId") WHERE "status" <> 'CLOSED';
```

- [x] **Step 4: Verify GREEN**

Run: `npx prisma format`, `npx prisma validate`, `npx prisma generate`, focused permissions test, all tests. Inspect migration: no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `DELETE`.

- [x] **Step 5: Commit**

```powershell
git add -- web/prisma web/src/lib/permissions.ts web/src/lib/__tests__/permissions.test.ts
git commit -m "feat: thêm nền dữ liệu và quyền hộp thư đa kênh"
git push origin master
```

### Task 3: Token encryption, OAuth state and signatures

**Files:**
- Create: `web/src/lib/channels/crypto.ts`
- Create: `web/src/lib/channels/signatures.ts`
- Create: `web/src/lib/channels/__tests__/crypto.test.ts`
- Create: `web/src/lib/channels/__tests__/signatures.test.ts`

**Interfaces:**
- `encryptChannelSecret(plain: string): string`; `decryptChannelSecret(value: string): string`.
- `createOAuthAttemptValues(): { state; stateHash; verifier; verifierEnc; challenge }`.
- `verifyMetaSignature(raw, header, appSecret): boolean`; `verifyZaloSignature(rawText, timestamp, header, appId, oaSecret): boolean`.

- [x] **Step 1: Write failing tests**

```typescript
it("round-trips without plaintext", () => {
  const encrypted = encryptChannelSecret("access-token-123");
  expect(encrypted).not.toContain("access-token-123");
  expect(decryptChannelSecret(encrypted)).toBe("access-token-123");
});

it("rejects a one-byte Meta mutation", () => {
  const raw = new TextEncoder().encode('{"object":"page"}');
  const sig = "sha256=" + createHmac("sha256", "secret").update(raw).digest("hex");
  expect(verifyMetaSignature(raw, sig, "secret")).toBe(true);
  expect(verifyMetaSignature(new TextEncoder().encode('{"object":"Page"}'), sig, "secret")).toBe(false);
});
```

Add Zalo fixture using literal `sha256(appId + rawText + timestamp + oaSecret)` and changed-timestamp rejection.

- [x] **Step 2: Verify RED**

Run both focused test files. Expected: FAIL because modules do not exist.

- [x] **Step 3: Implement minimal crypto**

Use AES-256-GCM with 12-byte IV and `v1.<iv>.<tag>.<ciphertext>` base64url envelope. Decode `CHANNEL_TOKEN_ENC_KEY` to exactly 32 bytes. Hash state/verifier with SHA-256; compare equal-length signature buffers using `timingSafeEqual`.

- [x] **Step 4: Verify GREEN**

Run focused tests and all tests. Expected: wrong key, tampered ciphertext, missing/malformed signature and timestamp mutation all fail closed.

- [x] **Step 5: Commit**

```powershell
git add -- web/src/lib/channels
git commit -m "feat: bảo vệ token OAuth và chữ ký webhook"
git push origin master
```

### Task 8: Assignment, lifecycle, notes, linking and send orchestration

**Files:**
- Create: `web/src/lib/channels/inbox.ts`
- Create: `web/src/lib/channels/__tests__/inbox.test.ts`
- Create: `web/src/app/(app)/cham-soc/inbox-actions.ts`
- Create: `web/src/app/(app)/cham-soc/inbox-queries.ts`
- Modify: `web/src/app/(app)/khach-hang/[id]/page.tsx`

**Interfaces:**
- `listInbox({ queue, provider, status, q, user }): Promise<InboxListItem[]>`.
- Actions: claim, assign, open/snooze/close, internal note, customer link, text/attachment send/retry and presence heartbeat.
- Actions return `{ ok?: true; error?: string; nonce?: number }` and call exact `requireCap` keys.

- [ ] **Step 1: Write failing state-machine tests**

```typescript
it("first reply atomically claims an unassigned conversation", async () => {
  const sent = await sendInboxText(store, provider, { conversationId: "c1", actorId: "u1", content: "Chào chị", clientNonce: "n1" });
  expect(sent.status).toBe("SENT");
  expect(store.conversations[0].assigneeId).toBe("u1");
  expect(store.events.map((event) => event.type)).toEqual(["ASSIGNED"]);
});
```

Add competing claim, duplicate nonce, provider failure retained as `FAILED`, snooze wake-up, customer-link audit, 15-second presence expiry, first-response timestamp and `viewAll` filtering.

- [ ] **Step 2: Verify RED**

Run focused inbox test. Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement service/actions**

Create `PENDING` before provider call. Claim with conditional `updateMany` on null assignee/current version; zero rows reloads and returns collision. Success stores provider ID/status and sets `firstResponseAt` once; failure stores clean code/message and keeps row. Internal note creates only `ConversationEvent(INTERNAL_NOTE)`. Presence upserts by conversation/user and ignores heartbeat older than 15 seconds. Customer timeline reads linked `InboxMessage` together with legacy `CareMessage` without copying rows. Actor ID always comes from authenticated session, never FormData.

- [ ] **Step 4: Verify GREEN**

Run focused/all tests. Expected: permission, idempotency, collision, error retention and audit pass.

- [ ] **Step 5: Commit**

```powershell
git add -- web/src/lib/channels/inbox.ts web/src/lib/channels/__tests__/inbox.test.ts web/src/app/'(app)'/cham-soc/inbox-actions.ts web/src/app/'(app)'/cham-soc/inbox-queries.ts web/src/app/'(app)'/khach-hang/'[id]'/page.tsx
git commit -m "feat: thêm phân công và trả lời hội thoại đa kênh"
git push origin master
```

### Task 9: Protected attachments

**Files:**
- Create: `web/src/lib/channels/attachments.ts`
- Create: `web/src/lib/channels/__tests__/attachments.test.ts`
- Create: `web/src/app/api/channels/attachments/[id]/route.ts`
- Modify: `web/src/lib/channels/ingest.ts`
- Modify: `web/docker-entrypoint.sh`
- Modify: `docker-compose.yml`

**Interfaces:**
- `downloadInboxAttachment(attachmentId): Promise<void>` and `sendInboxAttachment(input): Promise<InboxMessage>`; max 10 MiB; allow JPEG/PNG/WebP/PDF.
- Protected GET requires `inbox.view` and parent-conversation visibility.

- [ ] **Step 1: Write failing validation tests**

```typescript
it("rejects an executable named image.jpg", async () => {
  const response = new Response(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), { headers: { "content-type": "image/jpeg" } });
  await expect(validateAndStoreAttachment(response, input, fsStore)).rejects.toThrow("Loại tệp không được hỗ trợ");
  expect(fsStore.files).toHaveLength(0);
});
```

Add over-10-MiB, traversal filename, valid magic bytes and unauthorized read cases.

- [ ] **Step 2: Verify RED**

Run focused attachment test. Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement protected storage**

Store generated names under `/app/private/inbox/<account-id>/` in `zenith_inbox_attachments`, never `public/uploads`. Ingest creates `PENDING`; maintenance downloads and sets `READY`/`FAILED`. Outbound upload is validated/stored first, then the provider adapter uploads/sends and updates the same `InboxMessage`; retry reuses message/client nonce. Validate header plus streamed bytes, magic bytes and generated extension.

- [ ] **Step 4: Verify GREEN**

Run focused/all tests; request route as anonymous/SHAREHOLDER/CARE. Expected: 401-or-redirect, 403, 200 with `Cache-Control: private, no-store`.

- [ ] **Step 5: Commit**

```powershell
git add -- web/src/lib/channels web/src/app/api/channels/attachments web/docker-entrypoint.sh docker-compose.yml
git commit -m "feat: bảo vệ tệp đính kèm trong hộp thư"
git push origin master
```

### Task 10: Shared inbox and legacy-log UI

**Files:**
- Modify: `web/src/app/(app)/cham-soc/page.tsx`
- Create: `web/src/app/(app)/cham-soc/manual-log.tsx`
- Create: `web/src/app/(app)/cham-soc/inbox-shell.tsx`
- Create: `web/src/app/(app)/cham-soc/conversation-list.tsx`
- Create: `web/src/app/(app)/cham-soc/conversation-pane.tsx`
- Create: `web/src/app/(app)/cham-soc/customer-context.tsx`
- Create: `web/src/app/(app)/cham-soc/inbox-poller.tsx`
- Create: `web/src/app/(app)/cham-soc/inbox-view-model.ts`
- Create: `web/src/app/(app)/cham-soc/inbox-view-model.test.ts`

**Interfaces:**
- `buildInboxViewModel` emits serializable props/Vietnamese labels with no secrets.
- Query state: `tab=inbox|manual`, `queue=unassigned|mine|all`, `conversation=<id>`.

- [ ] **Step 1: Write failing view-model tests**

```typescript
it("shows clean failed status without provider internals", () => {
  const vm = buildInboxViewModel(failedFixture, careUser);
  expect(vm.messages[0].statusLabel).toBe("Gửi thất bại");
  expect(JSON.stringify(vm)).not.toContain("OAuthException");
  expect(JSON.stringify(vm)).not.toContain("access-token");
});
```

Add unlinked-contact label, provider badge, unread count, overdue badge only when `responseTargetMinutes` is configured, active viewer/typing label, hidden inbox for SHAREHOLDER and visible legacy tab.

- [ ] **Step 2: Verify RED**

Run focused view-model test. Expected: FAIL because view-model does not exist.

- [ ] **Step 3: Implement responsive UI**

Feature flag false renders current manual UI. Flag true plus `inbox.view` renders tabs, three queues, channel filters, three-pane desktop and list → thread → customer mobile flow. Composer sends validated text/image/file, displays provider window/error, retry, note, claim/status/link controls by capability. Poller refreshes every 5 seconds only visible and immediately on `visibilitychange` return; presence heartbeat is non-blocking.

- [ ] **Step 4: Verify GREEN and visuals**

Run focused/all tests, `npx tsc --noEmit`, ESLint, build and Playwright at 390×844/1440×1000. Expected: no overflow, working mobile back, safe zero-channel onboarding, legacy rows retained.

- [ ] **Step 5: Commit**

```powershell
git add -- web/src/app/'(app)'/cham-soc
git commit -m "feat: hoàn thiện giao diện hộp thư chăm sóc đa kênh"
git push origin master
```

### Task 11: Configuration, scheduler, documentation and release gate

**Files:**
- Modify: `.env.example`
- Modify: `web/.env.example`
- Modify: `docker-compose.yml`
- Modify: `web/docker-entrypoint.sh`
- Create: `windows/Cai-Bao-Tri-Kenh.ps1`
- Create: `windows/Cai-Bao-Tri-Kenh.bat`
- Create: `windows/Cai-Bao-Tri-Kenh.Tests.ps1`
- Modify: `README.md`
- Modify: `PROJECT-OVERVIEW.md`
- Modify: `web/README.md`
- Modify: `web/DEPLOY.md`
- Modify: `web/BAN-GIAO.md`
- Modify: `web/DU-AN.md`

**Interfaces:**
- Env: `OMNICHANNEL_ENABLED`, `PUBLIC_APP_URL`, `CHANNEL_TOKEN_ENC_KEY`, `CHANNEL_MAINTENANCE_SECRET`, `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_OA_SECRET`, `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `META_GRAPH_VERSION`.
- Scheduled task POSTs maintenance every 12 hours with bearer secret.

- [ ] **Step 1: Write failing scheduler test**

Test `-WhatIf` output uses exact maintenance URL, 12-hour interval, reads secret from env/runtime file and never prints its value.

- [ ] **Step 2: Verify RED**

Run scheduler test. Expected: FAIL because scheduler does not exist.

- [ ] **Step 3: Implement runtime secrets and docs**

Entrypoint generates/persists channel encryption and maintenance secrets once under `/app/.runtime` with mode `600` when env is empty. Compose passes provider secrets only from `.env`. Docs include callbacks, app-review permissions, test accounts, reconnect, backup/restore, flag rollback and secret-handling rules.

- [ ] **Step 4: Complete release gate**

From fresh exported context run Prisma format/validate/generate, all tests, TypeScript, ESLint, Next build and Docker build. Apply migration to disposable PostgreSQL 16, compare `CareMessage` count before/after, run valid/invalid webhook fixtures, and only then use dedicated Zalo/Meta test users for real OAuth/send-receive. Every command must exit 0; legacy row count cannot change; tokens cannot appear in Git, HTML or logs.

- [ ] **Step 5: Document evidence, commit and push**

```powershell
git add -- .env.example docker-compose.yml README.md PROJECT-OVERVIEW.md web/.env.example web/docker-entrypoint.sh web/README.md web/DEPLOY.md web/BAN-GIAO.md web/DU-AN.md windows/Cai-Bao-Tri-Kenh.ps1 windows/Cai-Bao-Tri-Kenh.bat windows/Cai-Bao-Tri-Kenh.Tests.ps1
git commit -m "docs: bàn giao vận hành hộp thư Zalo và Facebook"
git push origin master
```

## External Activation Checkpoint

Sau khi build và kiểm thử mô phỏng đạt, chủ dự án đăng nhập Zalo for Developers và Meta for Developers trong trình duyệt họ kiểm soát. Các App ID/secret, OA secret và domain HTTPS được điền trực tiếp vào `.env` trên máy vận hành, không gửi trong chat và không commit. Kênh chỉ chuyển `CONNECTED` sau health check, webhook thật và một vòng nhận-trả lời bằng tài khoản thử đều thành công.

## Self-review Record

- Spec coverage: schema, legacy compatibility, new-only cutoff, RBAC, OAuth, signatures, idempotency, token rotation, queues/claim/lifecycle, collision presence, notes, linking, response metrics, text/attachments, health, retention, mobile UI, rollback and operations each map to a numbered task.
- Placeholder scan: no deferred implementation marker or generic error/testing instruction remains.
- Type consistency: provider/event/action names introduced in Tasks 2–4 are the same names consumed by Tasks 5–10; Task 11 lists every environment variable used by connection and maintenance routes.
- Known external gate: app credentials, provider review and real test accounts are intentionally activation inputs, not source-code gaps.
