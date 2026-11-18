import { requireSameOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, assertLeadAccess, assertAssignee, requireOwner } from "@/lib/tenant";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
import { updateLeadSchema } from "@/lib/validation";
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const c = await requireWorkspace();
    const { id } = await params;
    const lead = await prisma.lead.findFirst({ where: { id, businessId: c.businessId, deletedAt: null }, include: { contact: true, notes: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" } }, tasks: { where: c.role === "STAFF" ? { assignedToId: c.user.id } : {}, orderBy: { dueAt: "asc" } } } });
    assertLeadAccess(c, lead);
    return ok(lead);
  } catch (e) { return fail(e); }
}
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); const { id } = await params;
    const input = updateLeadSchema.parse(await jsonBody(req));
    const current = await prisma.lead.findFirst({ where: { id, businessId: c.businessId, deletedAt: null } });
    assertLeadAccess(c, current);
    if (input.assignedToId !== undefined) {
      requireOwner(c);
      if (input.assignedToId) await assertAssignee(c, input.assignedToId);
    }
    const saved = await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({ where: { id, businessId: c.businessId }, data: input });
      await tx.leadEvent.create({ data: { businessId: c.businessId, leadId: id, actorId: c.user.id, action: input.assignedToId !== undefined ? "ASSIGNED" : "UPDATED", fromValue: current!.assignedToId, toValue: updated.assignedToId } });
      return updated;
    });
    return ok(saved);
  } catch (e) { return fail(e); }
}
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); requireOwner(c); const { id } = await params;
    await prisma.$transaction(async tx => {
      const updated = await tx.lead.updateMany({ where: { id, businessId: c.businessId, deletedAt: null }, data: { deletedAt: new Date() } });
      if (!updated.count) throw new ApiError(404, "NOT_FOUND", "Lead not found");
      await tx.leadEvent.create({ data: { businessId: c.businessId, leadId: id, actorId: c.user.id, action: "DELETED" } });
    });
    return ok({ deleted: true });
  } catch (e) { return fail(e); }
}
