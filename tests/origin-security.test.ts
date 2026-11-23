import { describe, expect, it } from "vitest";
import { ApiError } from "../src/lib/http";
import { requireSameOrigin } from "../src/lib/origin";

const request = (headers: Record<string, string> = {}) =>
  new Request("https://leadloop.example.test/api/v1/leads", { method: "POST", headers });

describe("cookie-authenticated write origin protection", () => {
  it("allows same-origin requests", () => {
    expect(() => requireSameOrigin(request({ origin: "https://leadloop.example.test", "sec-fetch-site": "same-origin" }))).not.toThrow();
  });
  it("rejects cross-site requests even if Origin is missing", () => {
    expect(() => requireSameOrigin(request({ "sec-fetch-site": "cross-site" }))).toThrow(ApiError);
  });
  it("rejects an origin on a different host or protocol", () => {
    expect(() => requireSameOrigin(request({ origin: "https://attacker.example.test" }))).toThrow(ApiError);
    expect(() => requireSameOrigin(request({ origin: "http://leadloop.example.test" }))).toThrow(ApiError);
  });
  it("continues to permit originless non-browser API clients", () => {
    expect(() => requireSameOrigin(request())).not.toThrow();
  });
});
