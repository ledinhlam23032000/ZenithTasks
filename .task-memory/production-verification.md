# Production verification checkpoint

- The actual origin was identified as `C:\Users\PC\ZenithTasks`, not `ZenithTasks-runtime`.
- It was updated to `origin/master` at squash-merge commit `c148dbc`, while keeping a local rollback branch `origin-before-ai-upgrade-20260818`.
- Existing `.env` secret values were not read or changed. Missing non-secret AI settings were added: `AI_WRITER_MODEL=deepseek-chat`, `AI_TIMEOUT_MS=30000`, `AI_MAX_RETRIES=2`; existing `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_PROVIDER` keys were present.
- Docker build succeeded for the actual origin image and the actual `zenithtasks-app-1` container was recreated on port 3000. PostgreSQL migration completed with `49 migrations found` and `No pending migrations to apply`. App log reported `Running Zenith Clinic at http://localhost:3000` and Next.js ready.
- Local `http://localhost:3000/login` returned HTTP 200.
- Public domain `https://trungtamphauthuattaohinhvathammybenhviendakhoahongphuc.xyz/login` redirected to the authenticated dashboard and loaded normally through the Cloudflare Tunnel.
- Public `/tro-ly` loaded the upgraded assistant UI. It showed the new `Đồng nghiệp số` wording, the microphone button `Nhập bằng giọng nói`, chat textarea, approval history and existing conversations.
- The current logged-in session contains old conversation data and showed `AI không trả về kế hoạch hợp lệ` for two old correction messages. This is a live model/old-conversation behavior issue to test with a new conversation, not evidence that the deployment failed.
- The separate `ZenithTasks-runtime` compose attempt was not the origin and failed to bind port 3000; it must be cleaned up without touching the real `zenithtasks` project or volumes after final verification.

## New conversation UI

- Public `/tro-ly` still loads after runtime cleanup.
- Clicking `Cuộc trò chuyện mới` shows the production assistant welcome message, the new professional wording `Đồng nghiệp số: phân tích, chia bước, đối chiếu và báo cáo rõ ràng`, three read-only suggested prompts, one mutation example, textarea, send button and microphone button.
- No message was sent in this new conversation and no business data was changed during this UI verification.

## Read-only smoke test

- A new conversation was opened and the read-only question `Tổng doanh thu 30 ngày qua bao nhiêu?` was sent through the production UI.
- The UI displayed `Em đang phân tích yêu cầu và chia nhỏ các bước…` with a loading indicator, but after the first wait it had not yet returned a final answer.
- Server logs remained healthy and showed no crash; the container was running Next.js normally and database migration was complete. This indicates a likely provider/request latency or assistant route issue, not a Docker/origin outage.
- No mutation or approval was triggered by this read-only question.

## Hotfix redeploy checkpoint

- Master on origin Windows is now at `68b55fc` (`fix: harden DeepSeek planner JSON fallback (#22)`).
- Hotfix image build passed TypeScript/Next.js and the real `zenithtasks-app-1` was recreated; database migration reported no pending migrations and local HTTP 200.
- Refreshing `/tro-ly` showed the previous `Tổng doanh thu 30 ngày qua bao nhiêu?` error because it was the already persisted old conversation. A new conversation was then opened successfully with the new welcome/suggested prompts.
- No fresh request has been sent after opening this clean post-hotfix conversation yet.

## Hotfix smoke test passed

- In a clean conversation after hotfix `68b55fc`, the same read-only question `Tổng doanh thu 30 ngày qua bao nhiêu?` returned successfully: `Tổng doanh thu thực thu 30 ngày qua là 66.000.000đ.`
- The assistant explicitly stated `Em chưa thực hiện thay đổi nào trong yêu cầu này.` and displayed the three workflow steps, so the read tool path and final response writer worked end-to-end through Cloudflare Tunnel.
- This confirms the previous planner failure was fixed by the DeepSeek adapter hardening. No mutation was performed.


## Pre-deploy verification — 2026-08-19 01:06 GMT+7

- URL: https://trungtamphauthuattaohinhvathammybenhviendakhoahongphuc.xyz/tro-ly
- User session: logged in as Lê Đình Lam / Quản trị viên.
- Current production behavior: conversation “Chào em. Em có thể nói chuyện được ko” displayed `Tôi chưa đọc được tham số yêu cầu. Anh hãy nói rõ tên, tháng hoặc số tiền.` with error steps. This confirms production is still on the pre-fix agent path; do not treat this as a failure of the sandbox branch.
- The page showed existing historical conversations and the per-conversation delete control.
- No write, approval, deletion, or destructive action was performed.
- Next action: commit and deploy the sandbox branch, then repeat read-only stress cases A01, A02, B01, E01, E06.
