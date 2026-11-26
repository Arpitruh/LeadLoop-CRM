import { createHash } from "node:crypto";

export type MailPurpose = "verification" | "password-reset" | "invitation";

/**
 * Two no-required-fee delivery options:
 * - Existing self-hosted Notification Service, using a published app template.
 * - Resend, if its free-tier API key and verified sender are configured.
 *
 * This function reports provider acceptance, NOT inbox receipt. In particular
 * Notification Service replies 202 after persisting work into its SQL outbox.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  link?: string,
  purpose?: MailPurpose,
): Promise<void> {
  if (to.toLowerCase().endsWith("@demo.leadloop.example")) return;
  const serviceUrl = process.env.NOTIFICATION_SERVICE_URL?.trim();
  const apiKey = process.env.NOTIFICATION_SERVICE_API_KEY?.trim();

  if (serviceUrl || apiKey) {
    if (!serviceUrl || !apiKey || !purpose || !link) {
      throw new Error("Notification Service email transport is incomplete");
    }
    const templates: Record<MailPurpose, string | undefined> = {
      verification: process.env.NOTIFICATION_TEMPLATE_VERIFICATION,
      "password-reset": process.env.NOTIFICATION_TEMPLATE_PASSWORD_RESET,
      invitation: process.env.NOTIFICATION_TEMPLATE_INVITATION,
    };
    const templateId = templates[purpose]?.trim();
    if (!templateId) throw new Error(`Missing Notification Service template for ${purpose}`);

    const base = new URL(serviceUrl);
    if (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.hostname === "localhost")) {
      throw new Error("Notification Service requires HTTPS in production");
    }
    // Idempotent per recipient + purpose + secret-bearing link. Never log
    // tokens or place them in the idempotency key in plain text.
    const idempotencyKey = createHash("sha256")
      .update(JSON.stringify({ to: to.toLowerCase(), purpose, link }))
      .digest("hex");
    const endpoint = new URL("/api/v1/notifications/send", base);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        recipient: to,
        channel: "email",
        templateId,
        payloadData: { subject, url: link, appName: "LeadLoop CRM" },
        idempotencyKey: `leadloop:${purpose}:${idempotencyKey}`,
      }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`Notification Service rejected ${purpose} email (HTTP ${response.status})`);
    }
    return;
  }

  if (process.env.RESEND_API_KEY) {
    if (!process.env.EMAIL_FROM) throw new Error("EMAIL_FROM is required for Resend email delivery");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Email provider rejected request (HTTP ${response.status})`);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    // Development only: preserve the local link-based flow without sending mail.
    console.info("[DEV EMAIL]", { to, subject, link });
    return;
  }
  throw new Error("Email transport is not configured: set Notification Service or Resend variables");
}

export function mailTemplate(title: string, message: string, url: string) {
  const safeUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>${title}</h2><p>${message}</p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:white;border-radius:8px;text-decoration:none">Open LeadLoop</a><p style="color:#6b7280;font-size:12px">If you didn't request this, you can ignore it.</p></div>`;
}
