import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import type { Membership, Lead } from "@/generated/prisma/client";
import { canAccessLead as checkLead } from "@/lib/policy";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue");
  if (!session.user.emailVerified) throw new ApiError(403, "UNVERIFIED", "Verify your email before continuing");
  return session.user;
}
export type Workspace = { user: Awaited<ReturnType<typeof getCurrentUser>>; membership: Membership; businessId: string; role: "OWNER" | "STAFF" };
export async function requireWorkspace(): Promise<Workspace> {
  const user = await getCurrentUser();
  const memberships = await prisma.membership.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (!memberships.length) throw new ApiError(403, "NO_WORKSPACE", "Create or join a workspace first");
  const selected = (await cookies()).get("ll_workspace")?.value;
  const membership = memberships.find((m) => m.businessId === selected) ?? memberships[0];
  return { user, membership, businessId: membership.businessId, role: membership.role };
}
export function requireOwner(context: Workspace) {
  if (context.role !== "OWNER") throw new ApiError(403, "FORBIDDEN", "Only workspace owners can do that");
}
export function canAccessLead(context: Workspace, lead: Pick<Lead, "assignedToId" | "businessId" | "deletedAt">) {
  return checkLead({ businessId: context.businessId, userId: context.user.id, role: context.role }, lead);
}
export function assertLeadAccess(context: Workspace, lead: Pick<Lead, "assignedToId" | "businessId" | "deletedAt"> | null) {
  if (!lead || !canAccessLead(context, lead)) throw new ApiError(404, "NOT_FOUND", "Lead not found");
}
export async function assertAssignee(context: Workspace, userId: string) {
  const member = await prisma.membership.findUnique({ where: { businessId_userId: { businessId: context.businessId, userId } } });
  if (!member) throw new ApiError(400, "INVALID_ASSIGNEE", "Assignee is not part of your workspace");
}
export function leadFilter(context: Workspace) {
  return { businessId: context.businessId, deletedAt: null, ...(context.role === "STAFF" ? { assignedToId: context.user.id } : {}) };
}
