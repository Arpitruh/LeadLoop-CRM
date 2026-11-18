
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { normalizePhone, createLeadSchema } from "@/lib/validation";
import { ApiError } from "@/lib/http";
import type { z } from "zod";
import { visibleLeadWhere as policyWhere } from "@/lib/policy";

type Input = z.infer<typeof createLeadSchema>;
export async function createLeadRecord(args: {
  businessId: string; userId?: string; input: Input; currencyCode: string;
  formId?: string; externalSubmissionId?: string; sourceDetail?: string;
}) {
  const { businessId, input, userId, currencyCode, formId, externalSubmissionId, sourceDetail } = args;
  let phone: string | null = null;
  try { phone = normalizePhone(input.phone); } catch { throw new ApiError(400, "INVALID_PHONE", "Provide a valid phone number"); }
  const email = input.email?.trim().toLowerCase() || null;
  // Retry serialization conflicts and read the winner of an idempotency-key race.
  // Do not create a second opportunity for a repeated external submission.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
    if (externalSubmissionId) {
      const prior = await tx.formSubmission.findUnique({ where: { businessId_externalSubmissionId: { businessId, externalSubmissionId } } });
      if (prior?.leadId) return { id: prior.leadId, duplicate: true };
    }
    let contact;
    if (phone) {
      contact = await tx.contact.upsert({
        where: { businessId_phoneE164: { businessId, phoneE164: phone } },
        create: { businessId, name: input.name, phoneE164: phone, email, consentAt: input.consent ? new Date() : undefined },
        update: {},
      });
    } else {
      contact = email ? await tx.contact.findFirst({ where: { businessId, email } }) : null;
      if (!contact) contact = await tx.contact.create({ data: { businessId, name: input.name, email, consentAt: input.consent ? new Date() : undefined } });
    }
    const lead = await tx.lead.create({ data: {
      businessId, contactId: contact.id, title: input.title, interest: input.interest || undefined,
      source: input.source, sourceDetail: sourceDetail || input.sourceDetail,
      assignedToId: input.assignedToId || userId || null, createdById: userId,
      valueMinor: input.valueMinor ?? null, currencyCode,
    } });
    await tx.leadEvent.create({ data: { businessId, leadId: lead.id, actorId: userId, action: "CREATED" } });
    if (input.dueAt && (input.assignedToId || userId)) {
      await tx.leadTask.create({ data: { businessId, leadId: lead.id, assignedToId: input.assignedToId || userId!, title: "First follow-up", dueAt: new Date(input.dueAt) } });
    }
    if (formId || externalSubmissionId) await tx.formSubmission.create({ data: { businessId, formId, leadId: lead.id, externalSubmissionId, sourceDetail } });
    return { id: lead.id, duplicate: false };
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (externalSubmissionId && (code === "P2002" || code === "P2034")) {
        const accepted = await prisma.formSubmission.findUnique({
          where: { businessId_externalSubmissionId: { businessId, externalSubmissionId } },
        });
        if (accepted?.leadId) return { id: accepted.leadId, duplicate: true };
      }
      if (code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new ApiError(503, "RETRY_EXHAUSTED", "Please try the submission again");
}
export function visibleLeadWhere(businessId: string, userId: string, role: "OWNER" | "STAFF"): Prisma.LeadWhereInput {
  return policyWhere({ businessId, userId, role });
}
