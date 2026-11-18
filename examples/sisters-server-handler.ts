/**
 * Example ONLY: adapt to Sister's Magical Spoon's EXISTING server endpoint.
 * NEVER use this from client-side JavaScript or ship the signing secret in the browser.
 * Persist externalSubmissionId and the original enquiry before forwarding so failures are retryable.
 */
import { randomUUID, createHmac } from "node:crypto";

type Submission = { externalSubmissionId?: string; name: string; phone: string; email?: string; pincode: string; plan?: string; meals?: number; deliveryPreference?: string; message?: string; consent: true };
export async function forwardToLeadLoop(submission: Submission) {
  const url = process.env.LEADLOOP_CRM_URL;
  const secret = process.env.LEADLOOP_SISTERS_SECRET;
  if (!url || !secret) throw new Error("LeadLoop integration is not configured");
  // Generate this ID ONCE when accepting the customer form, then store it in the site's database.
  const payload = JSON.stringify({ ...submission, externalSubmissionId: submission.externalSubmissionId || randomUUID() });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const res = await fetch(`${url}/api/v1/integrations/sisters-magical-spoon`, { method: "POST", headers: { "Content-Type": "application/json", "x-leadloop-timestamp": timestamp, "x-leadloop-signature": `sha256=${signature}` }, body: payload, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`LeadLoop ingest error: ${res.status}`);
  return res.json();
}
