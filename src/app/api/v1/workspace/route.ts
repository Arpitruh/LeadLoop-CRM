import { requireRegularUser } from "@/lib/demo";
import { requireSameOrigin } from "@/lib/origin";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
const schema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(40), timezone: z.string().default("Asia/Kolkata"), currencyCode: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR") });
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await getCurrentUser(); requireRegularUser(user);
    const input = schema.parse(await jsonBody(req));
    try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }); } catch { throw new ApiError(400, "TIMEZONE", "Invalid timezone"); }
    const business = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({ data: { ...input } });
      await tx.membership.create({ data: { userId: user.id, businessId: business.id, role: "OWNER" } });
      await tx.publicForm.create({ data: { businessId: business.id, publicKey: randomBytes(24).toString("base64url") } });
      return business;
    });
    (await cookies()).set("ll_workspace", business.id, { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return ok({ business }, 201);
  } catch (e) { if (e && typeof e === "object" && "code" in e && e.code === "P2002") return fail(new ApiError(409, "SLUG_EXISTS", "This workspace URL is taken")); return fail(e); }
}
