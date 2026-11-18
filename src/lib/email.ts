// Sending is isolated so transactional email providers can be swapped without touching auth.
export async function sendEmail(to: string, subject: string, html: string, link?: string) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[DEV EMAIL]", { to, subject, link });
      return;
    }
    throw new Error("RESEND_API_KEY must be configured before enabling email flows in production");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
}
export function mailTemplate(title: string, message: string, url: string) {
  const safeUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>${title}</h2><p>${message}</p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:white;border-radius:8px;text-decoration:none">Open LeadLoop</a><p style="color:#6b7280;font-size:12px">If you didn't request this, you can ignore it.</p></div>`;
}
