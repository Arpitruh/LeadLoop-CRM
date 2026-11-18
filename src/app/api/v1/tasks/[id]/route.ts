import { requireSameOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, assertLeadAccess, assertAssignee, requireOwner } from "@/lib/tenant";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
import { z } from "zod";
const schema = z.object({ status: z.enum(["OPEN", "DONE"]).optional(), dueAt: z.iso.datetime({ offset: true }).optional(), assignedToId: z.string().optional() });
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); const { id } = await params;
    const input = schema.parse(await jsonBody(req));
    const current = await prisma.leadTask.findFirst({ where: { id, businessId: c.businessId }, include: { lead: true } });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Task not found");
    assertLeadAccess(c, current.lead);
    if (c.role === "STAFF" && current.assignedToId !== c.user.id) throw new ApiError(404, "NOT_FOUND", "Task not found");
    if (input.assignedToId && input.assignedToId !== current.assignedToId) { requireOwner(c); await assertAssignee(c, input.assignedToId); }
    const task = await prisma.leadTask.update({ where: { id, businessId: c.businessId }, data: { ...input, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, completedAt: input.status === "DONE" ? new Date() : input.status === "OPEN" ? null : undefined } });
    return ok(task);
  } catch(e) { return fail(e); }
}
