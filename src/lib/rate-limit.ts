// MVP best-effort limiter per Node process. In a multi-instance deployment, add edge/platform throttling.
const requests = new Map<string, { count: number; resetAt: number }>();
export function limited(key: string, limit = 10, windowMs = 600_000): boolean {
  const now = Date.now();
  if (requests.size > 5000) for (const [k, v] of requests) if (v.resetAt < now) requests.delete(k);
  const item = requests.get(key);
  if (!item || item.resetAt < now) { requests.set(key, { count: 1, resetAt: now + windowMs }); return false; }
  item.count++;
  return item.count > limit;
}
export function ipForRequest(req: Request) {
  // x-forwarded-for is trusted only when configured by a trusted reverse proxy.
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
