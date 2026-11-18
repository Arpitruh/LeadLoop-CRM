import { createHmac, timingSafeEqual } from "node:crypto";
/** HMAC over `${timestamp}.${rawBody}`; timestamp is Unix seconds. */
export function signPayload(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
export function verifyPayload(secret: string, timestamp: string | null, rawBody: string, signature: string | null, now = Date.now()) {
  if (!timestamp || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const time = Number(timestamp);
  if (!Number.isInteger(time) || Math.abs(now - time * 1000) > 300_000) return false;
  const expected = Buffer.from(signPayload(secret, timestamp, rawBody), "hex");
  const received = Buffer.from(signature.slice(7), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
