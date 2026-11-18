import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/tenant";
import { ok, fail } from "@/lib/http";
import { dateBounds } from "@/lib/validation";
import { visibleLeadWhere } from "@/lib/lead-service";
export async function GET() {
  try {
    const c = await requireWorkspace();
    const business = await prisma.business.findUniqueOrThrow({ where: { id: c.businessId } });
    const where = visibleLeadWhere(c.businessId, c.user.id, c.role);
    const now = new Date(); const { start, end } = dateBounds(business.timezone, now);
    const taskWhere = { businessId: c.businessId, status: "OPEN" as const, lead: { deletedAt: null, ...(c.role === "STAFF" ? { assignedToId: c.user.id } : {}) }, ...(c.role === "STAFF" ? { assignedToId: c.user.id } : {}) };
    const [stageCounts, sources, newThisWeek, overdue, dueToday, unassigned, won, lost, wonValue, recent] = await Promise.all([
      prisma.lead.groupBy({ by: ["stage"], where, _count: { _all: true } }),
      prisma.lead.groupBy({ by: ["source"], where, _count: { _all: true } }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
      prisma.leadTask.count({ where: { ...taskWhere, dueAt: { lt: now } } }),
      prisma.leadTask.count({ where: { ...taskWhere, dueAt: { gte: start, lt: end } } }),
      c.role === "OWNER" ? prisma.lead.count({ where: { ...where, assignedToId: null } }) : Promise.resolve(0),
      prisma.lead.count({ where: { ...where, stage: "WON" } }),
      prisma.lead.count({ where: { ...where, stage: "LOST" } }),
      prisma.lead.aggregate({ where: { ...where, stage: "WON" }, _sum: { valueMinor: true } }),
      prisma.leadEvent.findMany({ where: { businessId: c.businessId, lead: where }, take: 7, orderBy: { createdAt: "desc" }, include: { lead: { select: { title: true } } } }),
    ]);
    return ok({ stageCounts: stageCounts.map(x => ({ name: x.stage, count: x._count._all })), sources: sources.map(x => ({ name: x.source, count: x._count._all })), newThisWeek, overdue, dueToday, unassigned, won, lost, conversionRate: won + lost ? Math.round(won / (won + lost) * 100) : 0, wonValueMinor: wonValue._sum.valueMinor || 0, currencyCode: business.currencyCode, recent });
  } catch(e) { return fail(e); }
}
