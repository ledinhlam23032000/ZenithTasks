"use server";

import { prisma } from "./db";
import { requireUser } from "./auth";

export type V2DemoState = { ok?: boolean; error?: string; message?: string };

export async function seedV2DemoAction(_prev: V2DemoState): Promise<V2DemoState> {
  const user = await requireUser(["ADMIN"]);
  if (process.env.ENABLE_ZENITH_V2 !== "true") return { error: "V2 đang khóa. Bật ENABLE_ZENITH_V2=true trong môi trường test trước." };
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.zProject.upsert({ where: { code: "CELLARISCA-DEMO" }, update: { name: "Cellarisca — Demo cơ chế", status: "ACTIVE", ownerUserId: user.id, enabledFeatures: ["organization", "mechanism", "simulation"], updatedAt: now }, create: { code: "CELLARISCA-DEMO", name: "Cellarisca — Demo cơ chế", description: "Dự án demo không chứa dữ liệu thật để kiểm thử cách nạp và mô phỏng cơ chế.", projectType: "DISTRIBUTION", status: "ACTIVE", ownerUserId: user.id, enabledFeatures: ["organization", "mechanism", "simulation"], settings: { demoOnly: true }, updatedAt: now } });
    await tx.zProjectMember.upsert({ where: { projectId_userId: { projectId: project.id, userId: user.id } }, update: { active: true, preset: "PROJECT_ADMIN", updatedAt: now }, create: { projectId: project.id, userId: user.id, preset: "PROJECT_ADMIN", active: true, updatedAt: now } });
    const unit = await tx.zOrganizationUnit.upsert({ where: { projectId_code: { projectId: project.id, code: "SALES" } }, update: { name: "Kinh doanh", active: true, updatedAt: now }, create: { projectId: project.id, code: "SALES", name: "Kinh doanh", type: "DEPARTMENT", active: true, updatedAt: now } });
    await tx.zProjectPosition.upsert({ where: { projectId_code: { projectId: project.id, code: "SALES_MANAGER" } }, update: { title: "Quản lý kinh doanh", unitId: unit.id, active: true }, create: { projectId: project.id, unitId: unit.id, code: "SALES_MANAGER", title: "Quản lý kinh doanh", permissions: ["mechanism.simulate"], active: true } });
    const definition = await tx.zMechanismDefinition.upsert({ where: { projectId_code: { projectId: project.id, code: "CELLARISCA_COMMISSION" } }, update: { name: "Hoa hồng Cellarisca demo", status: "DRAFT", updatedAt: now }, create: { projectId: project.id, code: "CELLARISCA_COMMISSION", name: "Hoa hồng Cellarisca demo", kind: "COMMISSION", description: "Demo: tính 30% trên doanh số bán ra.", status: "DRAFT", updatedAt: now } });
    await tx.zMechanismVersion.upsert({ where: { definitionId_version: { definitionId: definition.id, version: 1 } }, update: { ruleSpec: { roundingUnit: 1000, rules: [{ id: "commission", type: "percentage", base: "gross_sales", rate: 30, output: "company_revenue" }] }, status: "DRAFT", updatedAt: now }, create: { definitionId: definition.id, version: 1, status: "DRAFT", inputSchema: { gross_sales: "number" }, ruleSpec: { roundingUnit: 1000, rules: [{ id: "commission", type: "percentage", base: "gross_sales", rate: 30, output: "company_revenue" }] }, testCases: [{ input: { gross_sales: 7972000 }, expected: { company_revenue: 2392000 } }], createdById: user.id, updatedAt: now } });
    return { code: project.code, id: project.id };
  });
  return { ok: true, message: `Đã tạo ${result.code} với tổ chức và cơ chế demo. Chưa kích hoạt policy.` };
}
