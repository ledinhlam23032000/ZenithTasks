import { SignJWT } from "jose";
import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const result = await client.query('SELECT id, username, role, "fullName", "mustChangePassword" FROM "User" WHERE username IN ($1,$2,$3,$4,$5,$6,$7)', [
  "qa.global.admin",
  "qa.project.admin.a",
  "qa.project.admin.b",
  "qa.sales.a",
  "qa.finance.a",
  "qa.viewer.b",
  "qa.revoked.a",
]);
await client.end();

const users = new Map(result.rows.map((row) => [row.username, row]));
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET missing");

async function sessionFor(username) {
  const user = users.get(username);
  if (!user) throw new Error(`QA user missing: ${username}`);
  return new SignJWT({ uid: user.id, role: user.role, name: user.fullName, weakPw: false, mustChangePassword: false })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

async function get(username, path) {
  const token = await sessionFor(username);
  const response = await fetch(`http://127.0.0.1:3000${path}`, {
    redirect: "manual",
    headers: { cookie: `zsession=${token}` },
  });
  const body = await response.text();
  return {
    username,
    path,
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type"),
    bodyLength: body.length,
    bodyMarkers: {
      forbiddenPage: body.includes("Bạn không có quyền truy cập mục này"),
      projectA: body.includes("QA Company A"),
      projectB: body.includes("QA Company B"),
      projectDraft: body.includes("QA Company Draft"),
      projectArchived: body.includes("QA Company Archived"),
    },
  };
}

const cases = [
  ["qa.global.admin", "/du-an"],
  ["qa.global.admin", "/du-an/qa-company-a/ai"],
  ["qa.project.admin.a", "/du-an/qa-company-a"],
  ["qa.project.admin.a", "/du-an/qa-company-a/khach-hang"],
  ["qa.project.admin.a", "/du-an/qa-company-b"],
  ["qa.project.admin.a", "/du-an/qa-company-b/khach-hang"],
  ["qa.project.admin.b", "/du-an/qa-company-b"],
  ["qa.sales.a", "/du-an/qa-company-a/khach-hang"],
  ["qa.sales.a", "/du-an/qa-company-a/tai-chinh"],
  ["qa.finance.a", "/du-an/qa-company-a/tai-chinh"],
  ["qa.viewer.b", "/du-an/qa-company-b"],
  ["qa.viewer.b", "/du-an/qa-company-b/khach-hang"],
  ["qa.revoked.a", "/du-an/qa-company-a"],
  ["qa.project.admin.a", "/du-an/qa-company-draft"],
  ["qa.project.admin.a", "/du-an/qa-company-archived"],
];

const checks = await Promise.all(cases.map(([username, path]) => get(username, path)));
const byKey = new Map(checks.map((check) => [`${check.username} ${check.path}`, check]));
const isHttpSuccess = (check) => check.status >= 200 && check.status < 300;
const isForbiddenResponse = (check) => (check.status >= 300 && check.status < 500) || check.bodyMarkers?.forbiddenPage === true;
const allowsOnly = (key, marker) => {
  const check = byKey.get(key);
  return Boolean(check && isHttpSuccess(check) && !check.bodyMarkers?.forbiddenPage && check.bodyMarkers?.[marker]);
};
const deniesWithoutTenantMarker = (key, forbiddenMarker) => {
  const check = byKey.get(key);
  return Boolean(check && isForbiddenResponse(check) && !check.bodyMarkers?.[forbiddenMarker]);
};
const required = [
  ["qa.global.admin /du-an", () => allowsOnly("qa.global.admin /du-an", "projectA") && byKey.get("qa.global.admin /du-an")?.bodyMarkers?.projectB === true],
  ["qa.global.admin /du-an/qa-company-a/ai", () => allowsOnly("qa.global.admin /du-an/qa-company-a/ai", "projectA")],
  ["qa.project.admin.a /du-an/qa-company-a", () => allowsOnly("qa.project.admin.a /du-an/qa-company-a", "projectA")],
  ["qa.project.admin.a /du-an/qa-company-a/khach-hang", () => allowsOnly("qa.project.admin.a /du-an/qa-company-a/khach-hang", "projectA")],
  ["qa.project.admin.a /du-an/qa-company-b", () => deniesWithoutTenantMarker("qa.project.admin.a /du-an/qa-company-b", "projectB")],
  ["qa.project.admin.a /du-an/qa-company-b/khach-hang", () => deniesWithoutTenantMarker("qa.project.admin.a /du-an/qa-company-b/khach-hang", "projectB")],
  ["qa.project.admin.b /du-an/qa-company-b", () => allowsOnly("qa.project.admin.b /du-an/qa-company-b", "projectB")],
  ["qa.sales.a /du-an/qa-company-a/khach-hang", () => allowsOnly("qa.sales.a /du-an/qa-company-a/khach-hang", "projectA")],
  ["qa.sales.a /du-an/qa-company-a/tai-chinh", () => deniesWithoutTenantMarker("qa.sales.a /du-an/qa-company-a/tai-chinh", "projectA")],
  ["qa.finance.a /du-an/qa-company-a/tai-chinh", () => allowsOnly("qa.finance.a /du-an/qa-company-a/tai-chinh", "projectA")],
  ["qa.viewer.b /du-an/qa-company-b/khach-hang", () => deniesWithoutTenantMarker("qa.viewer.b /du-an/qa-company-b/khach-hang", "projectB")],
  ["qa.revoked.a /du-an/qa-company-a", () => deniesWithoutTenantMarker("qa.revoked.a /du-an/qa-company-a", "projectA")],
  ["qa.project.admin.a /du-an/qa-company-draft", () => deniesWithoutTenantMarker("qa.project.admin.a /du-an/qa-company-draft", "projectDraft")],
  ["qa.project.admin.a /du-an/qa-company-archived", () => deniesWithoutTenantMarker("qa.project.admin.a /du-an/qa-company-archived", "projectArchived")],
];
for (const [key, predicate] of required) {
  const check = byKey.get(key);
  if (!check || !predicate()) {
    console.error(JSON.stringify({ failed: key, check }, null, 2));
    process.exitCode = 1;
  }
}
console.log(JSON.stringify({ ok: process.exitCode !== 1, readOnly: true, cases: checks }, null, 2));
