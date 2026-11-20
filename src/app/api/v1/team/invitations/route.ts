import { requireSameOrigin } from "@/lib/origin";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { requireWorkspace, requireOwner } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { mailTemplate, sendEmail } from "@/lib/email";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
const schema = z.object({ email: z.email().trim().toLowerCase() });
export async function GET() {
  try {
    const c = await requireWorkspace(); requireOwner(c);
    const [members, invitations] = await Promise.all([
      prisma.membership.findMany({ where: { businessId: c.businessId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
      prisma.invitation.findMany({ where: { businessId: c.businessId }, select: { id: true, invitedEmail: true, role: true, expiresAt: true, acceptedAt: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return ok({ members, invitations });
  } catch (e) { return fail(e); }
}
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); requireOwner(c);
    const { email } = schema.parse(await jsonBody(req));
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await prisma.membership.findUnique({ where: { businessId_userId: { businessId: c.businessId, userId: user.id } } })) throw new ApiError(409, "MEMBER_EXISTS", "Already part of this workspace");
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitation = await prisma.invitation.create({ data: { businessId: c.businessId, invitedById: c.user.id, invitedEmail: email, role: "STAFF", tokenHash, expiresAt: new Date(Date.now() + 7 * 86400_000) } });
    const business = await prisma.business.findUniqueOrThrow({ where: { id: c.businessId } });
    const link = `${process.env.BETTER_AUTH_URL}/invite/${token}`;
    try {
      await sendEmail(email, `You're invited to ${business.name} on LeadLoop`, mailTemplate("Your invitation", "Accept your invitation to the workspace. This link expires in seven days.", link), link, "invitation");
    } catch (error) {
      await prisma.invitation.delete({ where: { id: invitation.id } });
      throw error;
    }
    return ok({ id: invitation.id, invitedEmail: email, expiresAt: invitation.expiresAt }, 201);
  } catch (e) { return fail(e); }
}
