# Current-State Inventory — Multi-company + AI phân cấp

**Baseline:** `origin/master` `ab86fdc` tại thời điểm audit.

| Khu vực | Đã có | Khoảng trống đã xác minh | Nguồn code |
|---|---|---|---|
| Company/tenant | `ZProject` có code unique, name, type, status DRAFT/ACTIVE/ARCHIVED, ownerUserId, currency, enabledFeatures/settings, quan hệ domain local | `createV2ProjectAction` đang ghi ACTIVE ngay, chưa có lifecycle transition/soft-delete/restore workflow; UI nói DRAFT nhưng server không đúng | `web/prisma/schema.prisma`, `web/src/lib/v2-project-actions.ts` |
| Account identity | `User` là identity hệ thống, username unique, bcrypt password, role global, active/employmentStatus, 2FA/mustChangePassword | Chưa có company-local account/invite flow; profile HR chính còn global; chưa chứng minh một user nhiều company với profile riêng | `web/prisma/schema.prisma`, `web/src/lib/auth.ts` |
| Membership | `ZProjectMember` unique `[projectId,userId]`, preset, permissions JSON, active, joinedAt/leftAt; add/reactivate/suspend giữ lịch sử | Chỉ global ADMIN quản lý; chưa có invite/first-login/reset flow; chưa có membership role resolution đủ sâu; chưa có runtime foreign/revoke walkthrough | `web/prisma/schema.prisma`, `web/src/lib/v2-member-actions.ts` |
| Organization/employee | `ZOrganizationUnit`, `ZProjectPosition`, `ZProjectAssignment` theo project; project members có preset | Assignment chưa được dùng như nguồn duy nhất để quyết định mọi capability; chưa có employee profile local đầy đủ | `web/prisma/schema.prisma` |
| Local business | Customer/Appointment/Sale/Ledger/Task/Payroll/Mechanism local đã có model/action/UI nền | Một số module còn `review`; payroll chưa payout/accounting; runtime isolation chưa đủ evidence | `web/prisma/schema.prisma`, `web/src/lib/v2-*` |
| AI workspace | Conversation/Approval có `workspaceKind` và `projectId`; policy có Internal/Project/Global; AI boundary vừa fail-closed legacy ngoài Internal | Chưa có AI child profile/config/tool registry/knowledge/policy per company; chưa có AI Tổng theo dõi/điều phối AI child; chưa có child health/usage/audit dashboard | `web/prisma/schema.prisma`, `web/src/lib/ai-governance.ts`, `web/src/app/(app)/tro-ly/agent.ts` |
| Global overview | `get_workspace_overview` aggregate ADMIN-only, project console bounded | Chưa có tổng hợp health/config/AI child status và cross-company control plane đầy đủ | `web/src/lib/v2-global-console-policy.ts`, `agent.ts` |
| Delete | Customer local có active/deletedAt/deletedById; member suspend giữ lịch sử | ZProject chưa có deletedAt/deletedBy/archivedBy/reason/restore; chưa có dependency preview, backup/rollback drill hoặc project delete UI | `web/prisma/schema.prisma`, `v2-project-actions.ts` |
| Test | Quality gates và CI code fixes pass; pure governance/navigation tests có | Chưa có DB fixture integration cho 2 company, authenticated Admin/Manager walkthrough, AI child/global runtime, lifecycle delete/restore | `.task-memory/zenith-review-2026-08-27/artifacts/final-handoff.md` |

## Immediate product conclusion

Nền tảng đã có **skeleton multi-project**, nhưng hiện chưa phải một SaaS-like multi-company product hoàn chỉnh. Ba việc phải làm trước mọi mở rộng nghiệp vụ là: sửa lifecycle tạo company thành DRAFT/ACTIVE transition, chuẩn hóa company-local account/membership/capability, và xây AI child/global control-plane trên cùng `WorkspaceContext`/RBAC thay vì tạo một hệ thống quyền song song.
