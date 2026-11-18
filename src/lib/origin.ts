import { ApiError } from "@/lib/http";
/** Reject browser cross-origin writes to cookie-authenticated APIs. */
export function requireSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // Non-browser API clients must still authenticate.
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(req.url);
    const actualHost = req.headers.get("x-forwarded-host") || requestUrl.host;
    const actualProtocol = req.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
    if (originUrl.host !== actualHost || originUrl.protocol.replace(":", "") !== actualProtocol) throw new Error("origin mismatch");
  } catch {
    throw new ApiError(403, "BAD_ORIGIN", "Cross-origin write is not allowed");
  }
}
