import { requireSameOrigin } from "@/lib/origin";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, requireOwner } from "@/lib/tenant";
import { ok, fail, jsonBody, ApiError } from "@/lib/http";
const schema = z.object({ name: z.string().min(2).max(80).optional(), timezone: z.string().max(80).optional(), currencyCode: z.enum(["INR", "USD", "GBP", "EUR"]).optional() });
export async function GET() {
  try {
    const c = await requireWorkspace();
    const business = await prisma.business.findUniqueOrThrow({ where: { id: c.businessId }, include: { forms: { select: { publicKey: true, name: true, enabled: true } } } });
    return ok(business);
  } catch(e) { return fail(e); }
}
export async function PATCH(req: Request) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); requireOwner(c);
    const input = schema.parse(await jsonBody(req));
    if (input.timezone) try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }); } catch { throw new ApiError(400, "TIMEZONE", "Invalid timezone"); }
    const data = await prisma.business.update({ where: { id: c.businessId }, data: input });
    return ok(data);
  } catch(e) { return fail(e); }
}
