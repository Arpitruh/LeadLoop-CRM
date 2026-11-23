import { ApiError } from "@/lib/http";

/**
 * Reject cross-site browser writes before a cookie-backed handler executes.
 * API clients without browser fetch metadata may omit Origin, but must still
 * authenticate in their route handler.
 */
export function requireSameOrigin(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  // Browsers reliably attach this metadata; a malicious form may omit Origin.
  if (site === "cross-site") {
    throw new ApiError(403, "BAD_ORIGIN", "Cross-origin write is not allowed");
  }

  const origin = req.headers.get("origin");
  if (!origin) return;
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
