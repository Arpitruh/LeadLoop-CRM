import { requireSameOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, assertLeadAccess } from "@/lib/tenant";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
import { stageSchema } from "@/lib/validation";
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    requireSameOrigin(req);
    const c = await requireWorkspace(); const { id } = await params;
    const input = stageSchema.parse(await jsonBody(req));
    const saved = await prisma.$transaction(async (tx) => {
      const current = await tx.lead.findFirst({ where: { id, businessId: c.businessId, deletedAt: null } });
      assertLeadAccess(c, current);
      if (current!.stage === input.stage) return current;
      if (input.stage === "LOST" && !input.lostReason?.trim()) throw new ApiError(400, "LOST_REASON", "A lost reason is required");
      if (input.stage === "WON" && input.valueMinor === undefined && current!.valueMinor === null) throw new ApiError(400, "WON_VALUE", "Enter the won value (in minor currency units)");
      const changed = await tx.lead.updateMany({ where: { id, businessId: c.businessId, deletedAt: null, stage: current!.stage }, data: {
        stage: input.stage, lostReason: input.stage === "LOST" ? input.lostReason : null,
        closedAt: ["WON", "LOST"].includes(input.stage) ? new Date() : null,
        ...(input.valueMinor !== undefined ? { valueMinor: input.valueMinor } : {}),
      } });
      if (!changed.count) throw new ApiError(409, "STAGE_CONFLICT", "This lead changed. Refresh before moving it again.");
      const updated = await tx.lead.findUniqueOrThrow({ where: { id } });
      await tx.leadEvent.create({ data: { businessId: c.businessId, leadId: id, actorId: c.user.id, action: "STAGE_CHANGED", fromValue: current!.stage, toValue: updated.stage } });
      return updated;
    });
    return ok(saved);
  } catch (e) { return fail(e); }
}
