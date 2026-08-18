# Sources and Evidence — ZenithTasks AI Deep Upgrade

| Nguồn | Loại | Độ tin cậy | Dùng cho |
|---|---|---|---|
| `web/src/app/(app)/tro-ly/agent.ts` | Mã nguồn | Cao | Planner, action registry, approval, final writer |
| `web/src/app/(app)/tro-ly/conversations.ts` | Mã nguồn | Cao | Conversation loading, history shaping, deletion |
| `web/src/app/(app)/tro-ly/page.tsx` | Mã nguồn | Cao | Sidebar/list lifecycle |
| `web/src/app/(app)/tro-ly/assistant-chat.tsx` | Mã nguồn | Cao | UX, send, voice, delete current thread |
| `web/src/lib/ai.ts` | Mã nguồn | Cao | DeepSeek adapter, JSON fallback, retry |
| `checks/assistant-evaluation-v1.md` | Test plan | Trung bình-cao | Existing safety cases C01-C20 |
| `.task-memory/production-verification.md` | Production evidence | Cao cho thời điểm ghi | Public smoke test, hotfix verification |
| `https://github.com/ledinhlam23032000/ZenithTasks` | GitHub | Cao | Commit/branch/source of truth |
| DeepSeek API configured on origin `.env` | Runtime fact, secret value not read | Cao | Model/base configuration |

## Evidence constraints

Sandbox không có DeepSeek production secret. Live model behavior phải kiểm tra qua origin/browser đã đăng nhập hoặc mock adapter. Không đưa API key vào artifact/bộ nhớ.
