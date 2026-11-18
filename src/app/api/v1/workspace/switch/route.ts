import { requireSameOrigin } from "@/lib/origin";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await getCurrentUser();
    const { businessId } = z.object({ businessId: z.string() }).parse(await jsonBody(req));
    const member = await prisma.membership.findUnique({ where: { businessId_userId: { businessId, userId: user.id } } });
    if (!member) throw new ApiError(404, "NOT_FOUND", "Workspace not found");
    (await cookies()).set("ll_workspace", businessId, { httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", sameSite: "lax" });
    return ok({ businessId });
  } catch(e) { return fail(e); }
}
