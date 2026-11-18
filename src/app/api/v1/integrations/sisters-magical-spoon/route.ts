import { z } from "zod";
import { verifyPayload } from "@/lib/signature";
import { createLeadRecord } from "@/lib/lead-service";
import { createLeadSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { ok, fail, ApiError } from "@/lib/http";
import { limited, ipForRequest } from "@/lib/rate-limit";

const schema = z.object({
  externalSubmissionId: z.string().min(8).max(128), name: z.string().trim().min(2).max(100),
  phone: z.string().max(30), email: z.union([z.email(), z.literal("")]).optional(),
  pincode: z.string().regex(/^\d{6}$/), plan: z.string().max(120).optional(),
  meals: z.number().int().min(1).max(10000).optional(),
  deliveryPreference: z.string().max(200).optional(), message: z.string().max(1000).optional(),
  consent: z.literal(true),
});
export async function POST(req: Request) {
  try {
    const secret = process.env.SISTERS_CRM_SECRET;
    const businessId = process.env.SISTERS_BUSINESS_ID;
    if (!secret || secret.length < 32 || !businessId) throw new ApiError(503, "NOT_CONFIGURED", "Integration not configured");
    if (limited(`sisters:${ipForRequest(req)}`, 30, 60_000)) throw new ApiError(429, "RATE_LIMITED", "Try again later");
    const raw = await req.text();
    if (raw.length > 16_000) throw new ApiError(413, "TOO_LARGE", "Payload too large");
    if (!verifyPayload(secret, req.headers.get("x-leadloop-timestamp"), raw, req.headers.get("x-leadloop-signature"))) throw new ApiError(401, "BAD_SIGNATURE", "Signature missing or invalid");
    let json: unknown; try { json = JSON.parse(raw); } catch { throw new ApiError(400, "INVALID_JSON", "Invalid JSON"); }
    const body = schema.parse(json);
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new ApiError(503, "NOT_CONFIGURED", "Integration workspace not configured");
    const detail = `Pincode: ${body.pincode}; plan: ${body.plan || "N/A"}; meals: ${body.meals || "N/A"}; delivery: ${body.deliveryPreference || "N/A"}; ${body.message || ""}`.slice(0, 500);
    const input = createLeadSchema.parse({ name: body.name, phone: body.phone, email: body.email, title: `Meal enquiry · ${body.plan || body.pincode}`, interest: detail, source: "WEBSITE_FORM", consent: true });
    try {
      const created = await createLeadRecord({ businessId, input, currencyCode: business.currencyCode, externalSubmissionId: `sisters:${body.externalSubmissionId}`, sourceDetail: "SISTERS_MAGICAL_SPOON" });
      return ok(created, created.duplicate ? 200 : 201);
    } catch (error) {
      // Concurrent retries may lose the UNIQUE constraint race. Return the winning result.
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        const prior = await prisma.formSubmission.findUnique({ where: { businessId_externalSubmissionId: { businessId, externalSubmissionId: `sisters:${body.externalSubmissionId}` } } });
        if (prior?.leadId) return ok({ id: prior.leadId, duplicate: true });
      }
      throw error;
    }
  } catch(e) { return fail(e); }
}
