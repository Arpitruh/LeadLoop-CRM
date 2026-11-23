/**
 * Non-destructive HTTP smoke test for local CI or a public deployment.
 * No credentials, customer data, or database mutations are required.
 *
 * Remote: SMOKE_BASE_URL=https://your-project.vercel.app npm run smoke
 */
const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const checks = [
  { path: "/", status: 200, match: /LeadLoop|great leads/i },
  { path: "/login", status: 200, match: /<html\\b/i },
  { path: "/api/health/live", status: 200, jsonStatus: "ok" },
  { path: "/api/health/ready", status: 200, jsonStatus: "ready" },
  // An anonymous caller must never read workspace or owner-only resources.
  { path: "/api/v1/leads", status: 401, errorCode: "UNAUTHENTICATED" },
  { path: "/api/v1/contacts", status: 401, errorCode: "UNAUTHENTICATED" },
  { path: "/api/v1/tasks", status: 401, errorCode: "UNAUTHENTICATED" },
  { path: "/api/v1/reports/summary", status: 401, errorCode: "UNAUTHENTICATED" },
  { path: "/api/v1/settings", status: 401, errorCode: "UNAUTHENTICATED" },
  { path: "/api/v1/team/invitations", status: 401, errorCode: "UNAUTHENTICATED" },
  // This request is rejected at the origin check before parsing its body or
  // authenticating. It must never create an invitation or access the database.
  {
    path: "/api/v1/team/invitations", method: "POST", status: 403,
    headers: { "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" },
    body: "{}", errorCode: "BAD_ORIGIN",
  },
];
let failures = 0;
for (const check of checks) {
  const url = new URL(check.path, base);
  try {
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw new Error("Use HTTPS for remote smoke test URLs");
    }
    const response = await fetch(url, {
      method: check.method || "GET",
      ...(check.body ? { body: check.body } : {}),
      signal: AbortSignal.timeout(15000),
      redirect: "manual",
      headers: { "Cache-Control": "no-cache", ...(check.headers || {}) },
    });
    const body = await response.text();
    let data;
    if (check.jsonStatus || check.errorCode) {
      try { data = JSON.parse(body); } catch { throw new Error("Expected JSON API response"); }
    }
    if (response.status !== check.status ||
        (check.match && !check.match.test(body)) ||
        (check.jsonStatus && data?.status !== check.jsonStatus) ||
        (check.errorCode && data?.error?.code !== check.errorCode)) {
      throw new Error(`Expected HTTP ${check.status}${check.errorCode ? " " + check.errorCode : ""}, got HTTP ${response.status}`);
    }
    console.log(`PASS ${check.method || "GET"} ${check.path}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${check.method || "GET"} ${check.path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
if (failures) process.exitCode = 1;
