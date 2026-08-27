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
    responseUrl: response.url,
    headers: {
      location: response.headers.get("location"),
      nextRedirect: response.headers.get("x-nextjs-redirect"),
      middlewareRewrite: response.headers.get("x-middleware-rewrite"),
    },
    bodyLength: body.length,
    bodyMarkers: {
      forbiddenPage: body.includes("Bạn không có quyền truy cập mục này") || body.includes("Mỗi nhân sự chỉ xem được phần công việc thuộc vai trò của mình"),
      metaForbidden: body.includes("/khong-co-quyen"),
      projectA: body.includes("QA Company A"),
      projectB: body.includes("QA Company B"),
      projectDraft: body.includes("QA Company Draft"),
      projectArchived: body.includes("QA Company Archived"),
      workspacePage: body.includes("Các module của workspace"),
      customersPage: body.includes("Hồ sơ khách hàng của"),
      financePage: body.includes("Sổ thu/chi của"),
      aiPage: body.includes("Quản trị AI con"),
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
const isForbiddenResponse = (check) => (check.status >= 300 && check.status < 500) || check.bodyMarkers?.forbiddenPage === true || check.bodyMarkers?.metaForbidden === true || Boolean(check.headers?.nextRedirect);
const allowsOnly = (key, marker) => {
  const check = byKey.get(key);
  return Boolean(check && isHttpSuccess(check) && !isForbiddenResponse(check) && check.bodyMarkers?.[marker]);
};
const deniesWithoutRouteMarker = (key, routeMarker) => {
  const check = byKey.get(key);
  return Boolean(check && isForbiddenResponse(check) && !check.bodyMarkers?.[routeMarker]);
};
const required = [
  ["qa.global.admin /du-an", () => allowsOnly("qa.global.admin /du-an", "projectA") && byKey.get("qa.global.admin /du-an")?.bodyMarkers?.projectB === true],
  ["qa.global.admin /du-an/qa-company-a/ai", () => allowsOnly("qa.global.admin /du-an/qa-company-a/ai", "aiPage")],
  ["qa.project.admin.a /du-an/qa-company-a", () => allowsOnly("qa.project.admin.a /du-an/qa-company-a", "workspacePage")],
  ["qa.project.admin.a /du-an/qa-company-a/khach-hang", () => allowsOnly("qa.project.admin.a /du-an/qa-company-a/khach-hang", "customersPage")],
  ["qa.project.admin.a /du-an/qa-company-b", () => deniesWithoutRouteMarker("qa.project.admin.a /du-an/qa-company-b", "workspacePage")],
  ["qa.project.admin.a /du-an/qa-company-b/khach-hang", () => deniesWithoutRouteMarker("qa.project.admin.a /du-an/qa-company-b/khach-hang", "customersPage")],
  ["qa.project.admin.b /du-an/qa-company-b", () => allowsOnly("qa.project.admin.b /du-an/qa-company-b", "workspacePage")],
  ["qa.sales.a /du-an/qa-company-a/khach-hang", () => allowsOnly("qa.sales.a /du-an/qa-company-a/khach-hang", "customersPage")],
  ["qa.sales.a /du-an/qa-company-a/tai-chinh", () => deniesWithoutRouteMarker("qa.sales.a /du-an/qa-company-a/tai-chinh", "financePage")],
  ["qa.finance.a /du-an/qa-company-a/tai-chinh", () => allowsOnly("qa.finance.a /du-an/qa-company-a/tai-chinh", "financePage")],
  ["qa.viewer.b /du-an/qa-company-b/khach-hang", () => deniesWithoutRouteMarker("qa.viewer.b /du-an/qa-company-b/khach-hang", "customersPage")],
  ["qa.revoked.a /du-an/qa-company-a", () => deniesWithoutRouteMarker("qa.revoked.a /du-an/qa-company-a", "workspacePage")],
  ["qa.project.admin.a /du-an/qa-company-draft", () => deniesWithoutRouteMarker("qa.project.admin.a /du-an/qa-company-draft", "workspacePage")],
  ["qa.project.admin.a /du-an/qa-company-archived", () => deniesWithoutRouteMarker("qa.project.admin.a /du-an/qa-company-archived", "workspacePage")],
];
for (const [key, predicate] of required) {
  const check = byKey.get(key);
  if (!check || !predicate()) {
    console.error(JSON.stringify({ failed: key, check }, null, 2));
    process.exitCode = 1;
  }
}
console.log(JSON.stringify({ ok: process.exitCode !== 1, readOnly: true, cases: checks }, null, 2));
