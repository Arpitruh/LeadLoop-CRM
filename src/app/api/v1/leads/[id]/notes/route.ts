import { requireSameOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, assertLeadAccess } from "@/lib/tenant";
import { jsonBody, ok, fail } from "@/lib/http";
import { noteSchema } from "@/lib/validation";
type Ctx = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Ctx) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); const { id } = await params;
    const data = noteSchema.parse(await jsonBody(req));
    const lead = await prisma.lead.findFirst({ where: { id, businessId: c.businessId, deletedAt: null } });
    assertLeadAccess(c, lead);
    const note = await prisma.note.create({ data: { ...data, leadId: id, businessId: c.businessId, authorId: c.user.id } });
    return ok(note, 201);
  } catch (e) { return fail(e); }
}
