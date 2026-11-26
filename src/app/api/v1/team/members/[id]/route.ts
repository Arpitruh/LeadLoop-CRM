import { requireRegularUser } from "@/lib/demo";
import { requireSameOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, requireOwner } from "@/lib/tenant";
import { fail, ok, ApiError } from "@/lib/http";
type Ctx = { params: Promise<{ id: string }> };
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); requireRegularUser(c.user); requireOwner(c);
    const { id } = await params;
    if (id === c.user.id) throw new ApiError(400, "SELF_REMOVAL", "Owner cannot remove themselves");
    await prisma.$transaction(async (tx) => {
      const member = await tx.membership.findUnique({ where: { businessId_userId: { businessId: c.businessId, userId: id } } });
      if (!member || member.role === "OWNER") throw new ApiError(404, "NOT_FOUND", "Staff member not found");
      await tx.lead.updateMany({ where: { businessId: c.businessId, assignedToId: id }, data: { assignedToId: null } });
      await tx.leadTask.updateMany({ where: { businessId: c.businessId, assignedToId: id }, data: { assignedToId: c.user.id } });
      const removedUser = await tx.user.findUniqueOrThrow({ where: { id } });
      await tx.invitation.updateMany({
        where: { businessId: c.businessId, invitedEmail: removedUser.email.toLowerCase(), acceptedAt: null },
        data: { expiresAt: new Date(0) },
      });
      await tx.membership.delete({ where: { businessId_userId: { businessId: c.businessId, userId: id } } });
    });
    return ok({ removed: true });
  } catch(e) { return fail(e); }
}
