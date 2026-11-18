/** Non-destructive HTTP smoke test. Only probes public, read-only URLs. */
const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const checks = [
  { path: "/", status: 200, match: /LeadLoop|great leads/i },
  { path: "/login", status: 200, match: /<html\b/i },
  { path: "/api/health/live", status: 200, jsonStatus: "ok" },
  { path: "/api/health/ready", status: 200, jsonStatus: "ready" },
];
let failures = 0;
for (const check of checks) {
  const url = new URL(check.path, base);
  try {
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw new Error("Use HTTPS for remote smoke test URLs");
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: "manual", headers: { "Cache-Control": "no-cache" } });
    const body = await response.text();
    const data = check.jsonStatus ? JSON.parse(body) : null;
    if (response.status !== check.status || (check.match && !check.match.test(body)) || (check.jsonStatus && data?.status !== check.jsonStatus)) {
      throw new Error(`Expected ${check.status}/${check.jsonStatus || "content"}, got ${response.status}`);
    }
    console.log(`PASS ${check.path}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${check.path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
if (failures) process.exitCode = 1;
