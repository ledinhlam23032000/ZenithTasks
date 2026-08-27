import { SignJWT } from "jose";
import pg from "pg";
import { readFile } from "node:fs/promises";

const { Client } = pg;
const databaseUrl = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("QA_DATABASE_URL or DATABASE_URL is required");
if (process.env.QA_CONFIRM !== "YES") throw new Error("QA_CONFIRM=YES is required");
if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is required");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
const usersResult = await client.query('SELECT id, username, role, "fullName" FROM "User" WHERE username = $1', ["qa.global.admin"]);
const user = usersResult.rows[0];
if (!user) throw new Error("qa.global.admin is missing");

const before = await client.query(`
  SELECT p.id, p.status,
    (SELECT count(*)::int FROM "ZWorkspaceCustomer" c WHERE c."projectId" = p.id) AS customers,
    (SELECT count(*)::int FROM "ZWorkspaceTask" t WHERE t."projectId" = p.id) AS tasks
  FROM "ZProject" p
  WHERE p.id IN ('qa-company-draft', 'qa-company-archived')
  ORDER BY p.id
`);
await client.end();

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const token = await new SignJWT({ uid: user.id, role: user.role, name: user.fullName, weakPw: false, mustChangePassword: false })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("10m")
  .sign(secret);

const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
function actionId(filename, exportedName) {
  for (const [id, entry] of Object.entries(manifest.node || {})) {
    if (entry.filename === filename && entry.exportedName === exportedName) return id;
  }
  throw new Error(`Action ID not found: ${filename}#${exportedName}`);
}

const actions = {
  customerCreate: actionId("src/lib/v2-customer-actions.ts", "createWorkspaceCustomerAction"),
  taskCreate: actionId("src/lib/v2-task-actions.ts", "createWorkspaceTaskAction"),
};

async function invoke(action, fields, path) {
  const form = new URLSearchParams();
  form.set("$ACTION_KEY", "");
  form.set("projectId", fields.projectId);
  for (const [key, value] of Object.entries(fields)) {
    if (key !== "projectId") form.set(key, value);
  }
  const response = await fetch(`http://127.0.0.1:3000${path}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: `zsession=${token}`,
      "next-action": action,
      "content-type": "application/x-www-form-urlencoded",
      "next-router-state-tree": "[\"\",{\"children\":[\"(app)\",{\"children\":[\"du-an\",{\"children\":[\"__PAGE__\",{}]}]}]}]",
    },
    body: form,
  });
  const body = await response.text();
  return {
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type"),
    denialSignal: Boolean(response.headers.get("location")) || body.includes("Không thể tạo") || body.includes("không thể tạo") || body.includes("active"),
  };
}

const cases = [
  {
    name: "customer-create-draft",
    action: actions.customerCreate,
    path: "/du-an/qa-company-draft/khach-hang",
    fields: { projectId: "qa-company-draft", code: "QA-DENY-DRAFT", fullName: "Synthetic Denied Draft", phoneLast4: "0000", source: "QA", note: "denial test" },
  },
  {
    name: "task-create-archived",
    action: actions.taskCreate,
    path: "/du-an/qa-company-archived/tasks",
    fields: { projectId: "qa-company-archived", title: "Synthetic Denied Archived", description: "denial test", priority: "NORMAL", dueDate: "2026-12-31", assigneeId: "" },
  },
];
const results = [];
for (const test of cases) results.push({ name: test.name, response: await invoke(test.action, test.fields, test.path) });

const verifyClient = new Client({ connectionString: databaseUrl });
await verifyClient.connect();
const after = await verifyClient.query(`
  SELECT p.id, p.status,
    (SELECT count(*)::int FROM "ZWorkspaceCustomer" c WHERE c."projectId" = p.id) AS customers,
    (SELECT count(*)::int FROM "ZWorkspaceTask" t WHERE t."projectId" = p.id) AS tasks
  FROM "ZProject" p
  WHERE p.id IN ('qa-company-draft', 'qa-company-archived')
  ORDER BY p.id
`);
await verifyClient.end();

const beforeMap = new Map(before.rows.map((row) => [row.id, row]));
const afterMap = new Map(after.rows.map((row) => [row.id, row]));
for (const row of before.rows) {
  const next = afterMap.get(row.id);
  if (!next || row.status === "ACTIVE" || row.customers !== next.customers || row.tasks !== next.tasks) {
    console.error(JSON.stringify({ failed: "post-write-count-check", before: row, after: next }, null, 2));
    process.exitCode = 1;
  }
}
for (const result of results) {
  if (!(result.response.status >= 300 && result.response.status < 400) && !result.response.denialSignal) {
    console.error(JSON.stringify({ failed: result.name, result }, null, 2));
    process.exitCode = 1;
  }
}
console.log(JSON.stringify({ ok: process.exitCode !== 1, readOnlyAfterDenial: true, noSyntheticRowsCreated: true, cases: results, before: [...beforeMap.values()], after: [...afterMap.values()] }, null, 2));
