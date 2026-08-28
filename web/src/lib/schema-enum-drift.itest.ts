/**
 * Chống tái phát: schema.prisma khai giá trị enum mà database KHÔNG có.
 *
 * Bối cảnh thật (2026-08-28): commit 75d95f3 thêm ZAiJobStatus.PENDING_APPROVAL,
 * ZProjectStatus.SUSPENDED và ZWorkspaceConfigKind.ROLES vào schema.prisma nhưng
 * quên viết migration. `prisma migrate deploy` báo "No pending migrations" (đúng —
 * không có file nào để chạy) nên không ai phát hiện. tsc xanh và toàn bộ unit test
 * xanh vì chúng chỉ đọc schema, không đọc database. Lỗi chỉ lộ ra khi code chạy
 * thật cố ghi PENDING_APPROVAL và Postgres từ chối giá trị enum không tồn tại —
 * tức là ngay trên đường approval gate của AI job, chỗ nguy hiểm nhất.
 *
 * Test này so trực tiếp schema.prisma với pg_enum của database QA.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Client } from "pg";

const rawUrl = process.env.QA_DATABASE_URL ?? "";
const looksQa = /(qa|test|staging)/i.test(rawUrl);
const looksClinic = /(clinic|production|trungtam|hongphuc)/i.test(rawUrl);
const enabled = process.env.QA_CONFIRM === "YES" && rawUrl !== "" && looksQa && !looksClinic;

function schemaEnums(): Map<string, string[]> {
  const schemaPath = fileURLToPath(new URL("../../prisma/schema.prisma", import.meta.url));
  const src = readFileSync(schemaPath, "utf8");
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(/^enum\s+(\w+)\s*\{([^}]*)\}/gm)) {
    const values = m[2]
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, "").trim())
      .filter((l) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(l));
    out.set(m[1], values);
  }
  return out;
}

describe.runIf(enabled)("schema.prisma enum không được lệch với database", () => {
  it("mọi giá trị enum khai trong schema đều tồn tại trong Postgres", async () => {
    const client = new Client({ connectionString: rawUrl });
    await client.connect();
    let dbRows: { typname: string; enumlabel: string }[];
    try {
      const res = await client.query<{ typname: string; enumlabel: string }>(
        `SELECT t.typname, e.enumlabel
           FROM pg_type t
           JOIN pg_enum e ON e.enumtypid = t.oid
           JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = current_schema()`,
      );
      dbRows = res.rows;
    } finally {
      await client.end();
    }

    const dbEnums = new Map<string, Set<string>>();
    for (const row of dbRows) {
      if (!dbEnums.has(row.typname)) dbEnums.set(row.typname, new Set());
      dbEnums.get(row.typname)!.add(row.enumlabel);
    }

    const drift: string[] = [];
    for (const [name, values] of schemaEnums()) {
      const inDb = dbEnums.get(name);
      if (!inDb) {
        drift.push(`enum "${name}" có trong schema.prisma nhưng KHÔNG có trong database (thiếu migration tạo type)`);
        continue;
      }
      const missing = values.filter((v) => !inDb.has(v));
      if (missing.length > 0) {
        drift.push(
          `enum "${name}" thiếu giá trị trong database: ${missing.join(", ")} ` +
            `→ cần migration ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS '...'`,
        );
      }
    }

    expect(drift, `Schema/DB enum drift:\n${drift.join("\n")}`).toEqual([]);
  });
});
