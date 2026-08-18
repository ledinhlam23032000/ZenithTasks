# Quality Checkpoint

- TypeScript: PASS via `pnpm exec tsc --noEmit`.
- Unit tests: PASS, 47 test files / 308 tests.
- Production build: PASS via `pnpm build`; route `/api/assistant/transcribe` được compile và xuất hiện trong route manifest.
- Diff whitespace: PASS via `git diff --check`.
- Lint: FAIL do một lỗi pre-existing ngoài phạm vi assistant ở `web/src/components/ui/dismissible-banner.tsx`; assistant-related lint error ở `file-actions.ts` đã được sửa. Còn một số warning unused pre-existing.
- Docker Compose syntax: chưa kiểm tra được vì sandbox không có binary `docker`; cần chạy `docker compose -f deploy/docker-compose.yml config --quiet` trên máy deploy.
- Voice provider live test: chưa chạy vì sandbox không có secret/credential production; cần staging credential để test transcription thật.
