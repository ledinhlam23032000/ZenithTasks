import { createHash, randomUUID } from "node:crypto";
import type { AiPolicyResult, AiToolRequest } from "./ai-governance";

export type AiApprovalPreview = {
  id: string;
  tokenHash: string;
  expiresAt: string;
  decision: AiPolicyResult["decision"];
  riskLevel: AiPolicyResult["riskLevel"];
  title: string;
  consequences: string[];
  requiredApprovals: number;
  affectedRecords: number;
  amount?: number;
  purpose?: string;
  rollback: AiPolicyResult["rollback"];
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED";
};

export function createApprovalPreview(policy: AiPolicyResult, request: AiToolRequest, ttlMinutes = 10): AiApprovalPreview {
  const id = randomUUID();
  const rawToken = `${id}:${request.toolName}:${Date.now()}`;
  return {
    id,
    tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
    decision: policy.decision,
    riskLevel: policy.riskLevel,
    title: policy.warningTitle ?? "Xác nhận thao tác AI",
    consequences: policy.consequences,
    requiredApprovals: policy.requiredApprovals,
    affectedRecords: request.recordCount ?? 1,
    amount: request.amount,
    purpose: request.purpose,
    rollback: policy.rollback,
    status: "PENDING",
  };
}

export function canConfirmPreview(preview: Pick<AiApprovalPreview, "status" | "expiresAt" | "decision">, now = new Date()): boolean {
  if (preview.status !== "PENDING") return false;
  if (new Date(preview.expiresAt).getTime() <= now.getTime()) return false;
  return preview.decision === "REQUIRE_CONFIRMATION" || preview.decision === "REQUIRE_APPROVAL";
}

export function confirmationMessage(preview: AiApprovalPreview): string {
  const amount = preview.amount === undefined ? "" : ` Giá trị dự kiến: ${preview.amount.toLocaleString("vi-VN")} VND.`;
  const purpose = preview.purpose ? ` Mục đích: ${preview.purpose}.` : "";
  return `${preview.title}. Mức rủi ro ${preview.riskLevel}. Ảnh hưởng ${preview.affectedRecords} bản ghi.${amount}${purpose} ${preview.consequences.join(" ")} Hoàn tác: ${preview.rollback}.`;
}
