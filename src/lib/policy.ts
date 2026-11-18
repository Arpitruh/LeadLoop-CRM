// Pure, testable authorization predicates. All DB callers must still scope by businessId.
export type PolicyContext = { businessId: string; role: "OWNER"|"STAFF"; userId: string };
export type PolicyLead = { businessId: string; assignedToId: string | null; deletedAt: Date | null };
export function canAccessLead(c: PolicyContext, lead: PolicyLead) {
  return lead.businessId === c.businessId && lead.deletedAt === null && (c.role === "OWNER" || lead.assignedToId === c.userId);
}
export function visibleLeadWhere(c: PolicyContext) {
  return { businessId: c.businessId, deletedAt: null, ...(c.role === "STAFF" ? { assignedToId: c.userId } : {}) };
}
