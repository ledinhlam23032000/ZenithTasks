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
  return {
    username,
    path,
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type"),
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
  ["qa.viewer.b", "/du-an/qa-company-b"],
  ["qa.viewer.b", "/du-an/qa-company-b/khach-hang"],
  ["qa.revoked.a", "/du-an/qa-company-a"],
  ["qa.project.admin.a", "/du-an/qa-company-draft"],
  ["qa.project.admin.a", "/du-an/qa-company-archived"],
];

const checks = await Promise.all(cases.map(([username, path]) => get(username, path)));
const byKey = new Map(checks.map((check) => [`${check.username} ${check.path}`, check]));
const isSuccess = (status) => status >= 200 && status < 300;
const isDenied = (status) => status >= 300 && status < 400;
const required = [
  ["qa.global.admin /du-an", isSuccess],
  ["qa.global.admin /du-an/qa-company-a/ai", isSuccess],
  ["qa.project.admin.a /du-an/qa-company-a", isSuccess],
  ["qa.project.admin.a /du-an/qa-company-a/khach-hang", isSuccess],
  ["qa.project.admin.a /du-an/qa-company-b", isDenied],
  ["qa.project.admin.a /du-an/qa-company-b/khach-hang", isDenied],
  ["qa.viewer.b /du-an/qa-company-b/khach-hang", isDenied],
  ["qa.revoked.a /du-an/qa-company-a", isDenied],
  ["qa.project.admin.a /du-an/qa-company-draft", isDenied],
  ["qa.project.admin.a /du-an/qa-company-archived", isDenied],
];
for (const [key, predicate] of required) {
  const check = byKey.get(key);
  if (!check || !predicate(check.status)) {
    console.error(JSON.stringify({ failed: key, check }, null, 2));
    process.exitCode = 1;
  }
}
console.log(JSON.stringify({ ok: process.exitCode !== 1, readOnly: true, cases: checks }, null, 2));
