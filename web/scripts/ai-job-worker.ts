// ============================================================================
// AI JOB WORKER — nhặt job QUEUED và thực thi qua executeAiJobRunner.
//
// Vì sao cần: `enqueueAiJobAction` đã xếp job vào ZAiJob từ trước, nhưng chưa
// từng có gì tự động nhặt job lên chạy — trước đây phải gọi tay qua UI
// "Thực thi ngay" (`executeAiJobAction`) cho từng job. Job PENDING_APPROVAL sau
// khi Admin duyệt (approveAiJobAction) quay lại QUEUED cũng cần worker này để
// thực sự chạy tiếp, nếu không sẽ nằm im vô thời hạn.
//
// Thiết kế: một vòng lặp polling đơn giản theo đúng mẫu `backup.mjs` đã có
// trong docker-entrypoint.sh (chạy nền, không thêm hạ tầng/queue service mới).
// Atomic lock trong executeAiJobRunner (updateMany where status='QUEUED') đã
// tự chống hai lần chạy trùng, nên nhiều lần gọi vòng lặp đè lên nhau là an
// toàn — worker này không cần tự khoá thêm.
//
// An toàn khi lỗi: bất kỳ job nào ném lỗi ngoài dự kiến đều bị bắt và ghi log,
// KHÔNG làm chết vòng lặp — một job hỏng không được kéo cả worker dừng theo.
// ============================================================================
// Dùng chung client lười (`./db`) — v2-ai-job-engine.ts cũng import từ đây, nên
// worker và engine luôn thấy CÙNG một pool kết nối, không tự mở thêm client thừa.
import { prisma } from "../src/lib/db";

const POLL_INTERVAL_MS = Number(process.env.AI_JOB_WORKER_POLL_MS) || 15_000;
const BATCH_SIZE = 5;

async function runOnce(): Promise<number> {
  const queued = await prisma.zAiJob.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, requestedById: true },
  });
  if (queued.length === 0) return 0;

  const { executeAiJobRunner } = await import("../src/lib/v2-ai-job-engine");
  let processed = 0;
  for (const job of queued) {
    try {
      const result = await executeAiJobRunner(job.id, job.requestedById);
      console.log(`[ai-job-worker] job=${job.id} status=${result.status} ok=${result.ok}`);
      processed++;
    } catch (err) {
      // Không để một job lỗi bất ngờ (bug, mất kết nối DB thoáng qua...) làm
      // chết cả vòng lặp — job đó tự có cơ chế retry/FAILED trong runner; ở
      // đây chỉ cần ghi log để biết mà điều tra, rồi worker đi tiếp job khác.
      console.error(`[ai-job-worker] job=${job.id} lỗi ngoài dự kiến:`, err instanceof Error ? err.message : err);
    }
  }
  return processed;
}

async function main() {
  console.log(`[ai-job-worker] bắt đầu, poll mỗi ${POLL_INTERVAL_MS}ms, tối đa ${BATCH_SIZE} job/lượt.`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const n = await runOnce();
      if (n > 0) console.log(`[ai-job-worker] đã xử lý ${n} job trong lượt này.`);
    } catch (err) {
      console.error("[ai-job-worker] lỗi vòng lặp (sẽ thử lại):", err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main();
