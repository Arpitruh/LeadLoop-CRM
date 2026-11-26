import { requireRegularUser } from "@/lib/demo";
import { requireSameOrigin } from "@/lib/origin";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/tenant";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
const schema = z.object({ token: z.string().length(64) });
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await getCurrentUser(); requireRegularUser(user);
    const { token } = schema.parse(await jsonBody(req));
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash } });
      if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date() || invitation.invitedEmail !== user.email.toLowerCase()) throw new ApiError(400, "INVALID_INVITE", "Invitation is invalid, expired, or addressed to a different email");
      // Claim the invitation atomically; concurrent requests cannot reuse it.
      const claim = await tx.invitation.updateMany({ where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (!claim.count) throw new ApiError(409, "INVITE_USED", "This invitation was already accepted");
      await tx.membership.upsert({ where: { businessId_userId: { businessId: invitation.businessId, userId: user.id } }, create: { businessId: invitation.businessId, userId: user.id, role: invitation.role }, update: {} });
      return { businessId: invitation.businessId };
    });
    return ok(result);
  } catch (e) { return fail(e); }
}
