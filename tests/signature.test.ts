import { describe, expect, it } from "vitest";
import { signPayload, verifyPayload } from "../src/lib/signature";
describe("Sister's Magical Spoon HMAC webhook", () => {
  const secret="a-very-long-secret-that-is-at-least-32-characters",body=JSON.stringify({externalSubmissionId:"submission-1"}),now=Date.now(),ts=String(Math.floor(now/1000));
  it("accepts valid signatures within five minutes",()=>expect(verifyPayload(secret,ts,body,`sha256=${signPayload(secret,ts,body)}`,now)).toBe(true));
  it("rejects wrong bodies",()=>expect(verifyPayload(secret,ts,body+"x",`sha256=${signPayload(secret,ts,body)}`,now)).toBe(false));
  it("rejects stale timestamps",()=>expect(verifyPayload(secret,String(Number(ts)-600),body,`sha256=${signPayload(secret,String(Number(ts)-600),body)}`,now)).toBe(false));
  it("rejects missing signature",()=>expect(verifyPayload(secret,ts,body,null,now)).toBe(false));
});
