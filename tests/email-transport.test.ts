import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email";

const original = {
  service: process.env.NOTIFICATION_SERVICE_URL,
  key: process.env.NOTIFICATION_SERVICE_API_KEY,
  verify: process.env.NOTIFICATION_TEMPLATE_VERIFICATION,
  reset: process.env.NOTIFICATION_TEMPLATE_PASSWORD_RESET,
  invite: process.env.NOTIFICATION_TEMPLATE_INVITATION,
  resend: process.env.RESEND_API_KEY,
  sender: process.env.EMAIL_FROM,
};
const envKeys = [
  "NOTIFICATION_SERVICE_URL", "NOTIFICATION_SERVICE_API_KEY",
  "NOTIFICATION_TEMPLATE_VERIFICATION", "NOTIFICATION_TEMPLATE_PASSWORD_RESET",
  "NOTIFICATION_TEMPLATE_INVITATION", "RESEND_API_KEY", "EMAIL_FROM",
] as const;
beforeEach(() => {
  for (const key of envKeys) delete process.env[key];
  process.env.NOTIFICATION_SERVICE_URL = "https://notification.example.test";
  process.env.NOTIFICATION_SERVICE_API_KEY = "test-app-secret";
  process.env.NOTIFICATION_TEMPLATE_VERIFICATION = "auth-verify";
  process.env.NOTIFICATION_TEMPLATE_PASSWORD_RESET = "auth-reset";
  process.env.NOTIFICATION_TEMPLATE_INVITATION = "auth-invite";
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    const old = ({
      NOTIFICATION_SERVICE_URL: original.service,
      NOTIFICATION_SERVICE_API_KEY: original.key,
      NOTIFICATION_TEMPLATE_VERIFICATION: original.verify,
      NOTIFICATION_TEMPLATE_PASSWORD_RESET: original.reset,
      NOTIFICATION_TEMPLATE_INVITATION: original.invite,
      RESEND_API_KEY: original.resend,
      EMAIL_FROM: original.sender,
    })[key];
    if (old === undefined) delete process.env[key]; else process.env[key] = old;
  }
});
describe("auth email delivery through Notification Service", () => {
  it.each([
    ["verification", "auth-verify"],
    ["password-reset", "auth-reset"],
    ["invitation", "auth-invite"],
  ] as const)("uses the correct %s template and backend API credential", async (purpose, template) => {
    const send = vi.fn().mockResolvedValue({ status: 202 });
    vi.stubGlobal("fetch", send);
    const link = `https://leadloop.example.test/${purpose}?token=secret-token`;
    await sendEmail("person@example.test", "Subject", "<p>HTML</p>", link, purpose);
    expect(send).toHaveBeenCalledOnce();
    const [url, options] = send.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe("https://notification.example.test/api/v1/notifications/send");
    expect(options.headers).toMatchObject({ "x-api-key": "test-app-secret" });
    const body = JSON.parse(String(options.body));
    expect(body).toMatchObject({
      recipient: "person@example.test", channel: "email", templateId: template,
      payloadData: { url: link, subject: "Subject", appName: "LeadLoop CRM" },
    });
    expect(body.idempotencyKey).toMatch(/^leadloop:/);
    expect(body.idempotencyKey).not.toContain("secret-token");
  });
  it("generates stable but purpose-specific idempotency hashes", async () => {
    const send = vi.fn().mockResolvedValue({ status: 202 });
    vi.stubGlobal("fetch", send);
    const link = "https://leadloop.example.test/verify?token=secret";
    await sendEmail("person@example.test", "Verify", "", link, "verification");
    await sendEmail("person@example.test", "Verify", "", link, "verification");
    await sendEmail("person@example.test", "Reset", "", link, "password-reset");
    const keys = send.mock.calls.map((x: [URL, RequestInit]) => JSON.parse(String(x[1].body)).idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).not.toBe(keys[2]);
  });
  it("rejects a provider error instead of claiming an email was sent", async () => {
    const send = vi.fn().mockResolvedValue({ status: 429 });
    vi.stubGlobal("fetch", send);
    await expect(sendEmail("person@example.test", "Subject", "", "https://leadloop.example.test/verify?token=abc", "verification"))
      .rejects.toThrow("HTTP 429");
  });
  it("does not fall back silently when the application API key is missing", async () => {
    delete process.env.NOTIFICATION_SERVICE_API_KEY;
    process.env.RESEND_API_KEY = "other-provider-key";
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    await expect(sendEmail("person@example.test", "Subject", "", "https://leadloop.example.test/v", "verification"))
      .rejects.toThrow("incomplete");
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects an unconfigured event template", async () => {
    delete process.env.NOTIFICATION_TEMPLATE_VERIFICATION;
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    await expect(sendEmail("person@example.test", "Subject", "", "https://leadloop.example.test/v", "verification"))
      .rejects.toThrow("Missing Notification Service template");
    expect(send).not.toHaveBeenCalled();
  });
  it("keeps existing Resend delivery as an optional alternative", async () => {
    delete process.env.NOTIFICATION_SERVICE_URL;
    delete process.env.NOTIFICATION_SERVICE_API_KEY;
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.EMAIL_FROM = "no-reply@example.test";
    const send = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", send);
    await sendEmail("person@example.test", "Verify", "<p>test</p>", "https://leadloop.example.test/v", "verification");
    expect(send.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    expect(send.mock.calls[0][1].headers.Authorization).toBe("Bearer resend-test-key");
  });
});