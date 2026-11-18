import { requireSameOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, assertAssignee } from "@/lib/tenant";
import { jsonBody, ok, fail, paramInt, ApiError } from "@/lib/http";
import { createLeadSchema, stages, sources } from "@/lib/validation";
import { createLeadRecord, visibleLeadWhere } from "@/lib/lead-service";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: Request) {
  try {
    const c = await requireWorkspace();
    const p = new URL(req.url).searchParams;
    const page = paramInt(p.get("page"), 1, 100_000);
    const size = paramInt(p.get("size"), 20, 100);
    const q = p.get("q")?.trim().slice(0, 100);
    const stage = p.get("stage");
    const source = p.get("source");
    const assignee = p.get("assignee");
    const where: Prisma.LeadWhereInput = { ...visibleLeadWhere(c.businessId, c.user.id, c.role),
      ...(stage && stages.includes(stage as typeof stages[number]) ? { stage: stage as typeof stages[number] } : {}),
      ...(source && sources.includes(source as typeof sources[number]) ? { source: source as typeof sources[number] } : {}),
      ...(assignee && c.role === "OWNER" ? { assignedToId: assignee === "unassigned" ? null : assignee } : {}),
      ...(q ? { OR: [ { title: { contains: q, mode: "insensitive" } }, { contact: { name: { contains: q, mode: "insensitive" } } }, { contact: { phoneE164: { contains: q } } } ] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * size, take: size, include: { contact: true } }),
      prisma.lead.count({ where }),
    ]);
    return ok(items, 200, { page, size, total, pages: Math.ceil(total / size) });
  } catch (e) { return fail(e); }
}
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace();
    const input = createLeadSchema.parse(await jsonBody(req));
    if (c.role === "STAFF" && input.assignedToId && input.assignedToId !== c.user.id) throw new ApiError(403, "FORBIDDEN", "Staff cannot assign leads to teammates");
    if (input.assignedToId) await assertAssignee(c, input.assignedToId);
    const business = await prisma.business.findUniqueOrThrow({ where: { id: c.businessId } });
    const lead = await createLeadRecord({ businessId: c.businessId, userId: c.user.id, input, currencyCode: business.currencyCode });
    return ok(lead, 201);
  } catch (e) { return fail(e); }
}
