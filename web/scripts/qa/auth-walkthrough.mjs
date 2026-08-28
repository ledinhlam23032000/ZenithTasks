import { SignJWT } from "jose";
import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const result = await client.query('SELECT id, username, role, "fullName", "mustChangePassword" FROM "User" WHERE username IN ($1,$2,$3,$4,$5,$6,$7)', [
  "admin",
  "adminduana",
  "adminduana2",
  "sales",
  "taichinh",
  "viewer",
  "revoked",
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
      projectACode: body.includes("QA-COMPANY-A"),
      projectBCode: body.includes("QA-COMPANY-B"),
      projectDraft: body.includes("QA Company Draft"),
      projectArchived: body.includes("QA Company Archived"),
      customerAData: body.includes("QA-QA-COMPANY-A-001"),
      customerBData: body.includes("QA-QA-COMPANY-B-001"),
      taskAData: body.includes("Synthetic QA-COMPANY-A Task 001"),
      taskBData: body.includes("Synthetic QA-COMPANY-B Task 001"),
      csv: (response.headers.get("content-type") ?? "").startsWith("text/csv"),
      actionIds: [...body.matchAll(/\$ACTION_ID_[A-Za-z0-9_-]+/g)].map((match) => match[0]).slice(0, 20),
      workspacePage: body.includes("Các module của workspace"),
      customersPage: body.includes("Hồ sơ khách hàng của"),
      financePage: body.includes("Sổ thu/chi của"),
      aiPage: body.includes("AI riêng của") || body.includes("Danh sách AI con"),
    },
  };
}

const cases = [
  ["admin", "/du-an"],
  ["admin", "/du-an/qa-company-a/ai"],
  ["adminduana", "/du-an/qa-company-a"],
  ["adminduana", "/du-an/qa-company-a/khach-hang"],
  ["adminduana", "/du-an/qa-company-b"],
  ["adminduana", "/du-an/qa-company-b/khach-hang"],
  ["adminduana2", "/du-an/qa-company-b"],
  ["sales", "/du-an/qa-company-a/khach-hang"],
  ["sales", "/du-an/qa-company-a/tai-chinh"],
  ["taichinh", "/du-an/qa-company-a/tai-chinh"],
  ["viewer", "/du-an/qa-company-b"],
  ["viewer", "/du-an/qa-company-b/khach-hang"],
  ["revoked", "/du-an/qa-company-a"],
  ["adminduana", "/du-an/qa-company-draft"],
  ["adminduana", "/du-an/qa-company-archived"],
  ["adminduana", "/du-an/qa-company-a/khach-hang/export"],
  ["adminduana", "/du-an/qa-company-a/tasks/export"],
  ["adminduana2", "/du-an/qa-company-b/khach-hang/export"],
  ["adminduana", "/du-an/qa-company-b/khach-hang/export"],
  ["viewer", "/du-an/qa-company-b/khach-hang/export"],
  ["adminduana", "/du-an/qa-company-draft/khach-hang/export"],
  ["adminduana", "/du-an/qa-company-archived/khach-hang/export"],
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
  ["admin /du-an", () => allowsOnly("admin /du-an", "projectA") && byKey.get("admin /du-an")?.bodyMarkers?.projectB === true],
  ["admin /du-an/qa-company-a/ai", () => allowsOnly("admin /du-an/qa-company-a/ai", "aiPage")],
  ["adminduana /du-an/qa-company-a", () => allowsOnly("adminduana /du-an/qa-company-a", "workspacePage")],
  ["adminduana /du-an/qa-company-a/khach-hang", () => allowsOnly("adminduana /du-an/qa-company-a/khach-hang", "customersPage") && byKey.get("adminduana /du-an/qa-company-a/khach-hang")?.bodyMarkers?.customerAData === true],
  ["adminduana /du-an/qa-company-b", () => deniesWithoutRouteMarker("adminduana /du-an/qa-company-b", "workspacePage")],
  ["adminduana /du-an/qa-company-b/khach-hang", () => deniesWithoutRouteMarker("adminduana /du-an/qa-company-b/khach-hang", "customerBData")],
  ["adminduana2 /du-an/qa-company-b", () => allowsOnly("adminduana2 /du-an/qa-company-b", "workspacePage")],
  ["sales /du-an/qa-company-a/khach-hang", () => allowsOnly("sales /du-an/qa-company-a/khach-hang", "customersPage")],
  ["sales /du-an/qa-company-a/tai-chinh", () => deniesWithoutRouteMarker("sales /du-an/qa-company-a/tai-chinh", "financePage")],
  ["taichinh /du-an/qa-company-a/tai-chinh", () => allowsOnly("taichinh /du-an/qa-company-a/tai-chinh", "financePage")],
  ["viewer /du-an/qa-company-b/khach-hang", () => deniesWithoutRouteMarker("viewer /du-an/qa-company-b/khach-hang", "customerBData")],
  ["revoked /du-an/qa-company-a", () => deniesWithoutRouteMarker("revoked /du-an/qa-company-a", "workspacePage")],
  ["adminduana /du-an/qa-company-draft", () => deniesWithoutRouteMarker("adminduana /du-an/qa-company-draft", "workspacePage")],
  ["adminduana /du-an/qa-company-archived", () => deniesWithoutRouteMarker("adminduana /du-an/qa-company-archived", "workspacePage")],
  ["adminduana /du-an/qa-company-a/khach-hang/export", () => { const check = byKey.get("adminduana /du-an/qa-company-a/khach-hang/export"); return Boolean(check && check.bodyMarkers.csv && check.bodyMarkers.customerAData && !isForbiddenResponse(check)); }],
  ["adminduana /du-an/qa-company-a/tasks/export", () => { const check = byKey.get("adminduana /du-an/qa-company-a/tasks/export"); return Boolean(check && check.bodyMarkers.csv && check.bodyMarkers.taskAData && !isForbiddenResponse(check)); }],
  ["adminduana2 /du-an/qa-company-b/khach-hang/export", () => { const check = byKey.get("adminduana2 /du-an/qa-company-b/khach-hang/export"); return Boolean(check && check.bodyMarkers.csv && check.bodyMarkers.customerBData && !isForbiddenResponse(check)); }],
  ["adminduana /du-an/qa-company-b/khach-hang/export", () => deniesWithoutRouteMarker("adminduana /du-an/qa-company-b/khach-hang/export", "customerBData")],
  ["viewer /du-an/qa-company-b/khach-hang/export", () => deniesWithoutRouteMarker("viewer /du-an/qa-company-b/khach-hang/export", "customerBData")],
  ["adminduana /du-an/qa-company-draft/khach-hang/export", () => deniesWithoutRouteMarker("adminduana /du-an/qa-company-draft/khach-hang/export", "customerAData")],
  ["adminduana /du-an/qa-company-archived/khach-hang/export", () => deniesWithoutRouteMarker("adminduana /du-an/qa-company-archived/khach-hang/export", "customerAData")],
];
for (const [key, predicate] of required) {
  const check = byKey.get(key);
  if (!check || !predicate()) {
    console.error(JSON.stringify({ failed: key, check }, null, 2));
    process.exitCode = 1;
  }
}
console.log(JSON.stringify({ ok: process.exitCode !== 1, readOnly: true, cases: checks }, null, 2));
