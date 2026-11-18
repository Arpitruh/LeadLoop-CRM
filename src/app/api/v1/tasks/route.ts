import { requireSameOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, assertLeadAccess, assertAssignee } from "@/lib/tenant";
import { jsonBody, ok, fail } from "@/lib/http";
import { taskSchema } from "@/lib/validation";
export async function GET() {
  try {
    const c = await requireWorkspace();
    const tasks = await prisma.leadTask.findMany({ where: { businessId: c.businessId, lead: { deletedAt: null, ...(c.role === "STAFF" ? { assignedToId: c.user.id } : {}) }, ...(c.role === "STAFF" ? { assignedToId: c.user.id } : {}) }, include: { lead: { include: { contact: { select: { name: true, phoneE164: true } } } } }, orderBy: { dueAt: "asc" }, take: 250 });
    return ok(tasks);
  } catch (e) { return fail(e); }
}
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); const input = taskSchema.parse(await jsonBody(req));
    const lead = await prisma.lead.findFirst({ where: { id: input.leadId, businessId: c.businessId, deletedAt: null } });
    assertLeadAccess(c, lead);
    const assignedToId = c.role === "STAFF" ? c.user.id : input.assignedToId || lead!.assignedToId || c.user.id;
    await assertAssignee(c, assignedToId);
    const task = await prisma.leadTask.create({ data: { businessId: c.businessId, leadId: input.leadId, assignedToId, title: input.title, type: input.type, dueAt: new Date(input.dueAt) } });
    return ok(task, 201);
  } catch (e) { return fail(e); }
}
