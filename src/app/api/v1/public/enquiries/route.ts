import { prisma } from "@/lib/prisma";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
import { publicEnquirySchema, createLeadSchema } from "@/lib/validation";
import { limited, ipForRequest } from "@/lib/rate-limit";
import { createLeadRecord } from "@/lib/lead-service";
export async function POST(req: Request) {
  try {
    const ip = ipForRequest(req);
    if (limited(`public:${ip}`, 8)) throw new ApiError(429, "RATE_LIMITED", "Too many submissions. Try again shortly.");
    const body = publicEnquirySchema.parse(await jsonBody(req));
    if (body.website) return ok({ accepted: true }, 202); // Honeypot, intentionally no lead created.
    const form = await prisma.publicForm.findUnique({ where: { publicKey: body.publicKey }, include: { business: true } });
    if (!form?.enabled) throw new ApiError(404, "NOT_FOUND", "This form is not available");
    const input = createLeadSchema.parse({ name: body.name, phone: body.phone, email: body.email, title: body.interest, interest: body.message, source: "WEBSITE_FORM", consent: true });
    const result = await createLeadRecord({ businessId: form.businessId, input, currencyCode: form.business.currencyCode, formId: form.id, externalSubmissionId: body.externalSubmissionId ? `public:${form.id}:${body.externalSubmissionId}` : undefined });
    // A repeated submission is safe to acknowledge, but must not pretend
    // that another lead was created. Keep the public response minimal.
    return ok({ accepted: true }, result.duplicate ? 200 : 201);
  } catch (e) { return fail(e); }
}
