import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";

export const DEMO_COOKIE = "ll_demo";
export const DEMO_TTL = 60 * 60;
const USER_PREFIX = "demo-user-";
const BUSINESS_PREFIX = "demo-business-";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export const isDemoUser = (id: string) => id.startsWith(USER_PREFIX);
export const demoBusinessId = (userId: string) => BUSINESS_PREFIX + userId.slice(USER_PREFIX.length);
export function requireRegularUser(user: { id: string }) {
  if (isDemoUser(user.id)) throw new ApiError(403, "DEMO_RESTRICTED", "This action is unavailable in the demo. Create your own account to continue.");
}
export async function getDemoUser(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return prisma.user.findFirst({
    where: { id: USER_PREFIX + digest(token), createdAt: { gt: new Date(Date.now() - DEMO_TTL * 1000) },
      memberships: { some: { businessId: BUSINESS_PREFIX + digest(token), role: "OWNER" } } },
  });
}

// Revoke the opaque token immediately; cleanup is scoped to its disposable workspace.
export async function endDemo(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  const hash = digest(token);
  await prisma.$transaction([
    prisma.user.updateMany({ where: { id: USER_PREFIX + hash }, data: { createdAt: new Date(0) } }),
    prisma.business.updateMany({ where: { id: BUSINESS_PREFIX + hash }, data: { createdAt: new Date(0) } }),
  ]);
}

const sample = [
  ["Aarav Mehta", "Website redesign", "NEW", "WEBSITE_FORM", 45000],
  ["Diya Kapoor", "Monthly marketing package", "NEW", "INSTAGRAM", 25000],
  ["Kabir Rao", "Customer portal", "NEW", "REFERRAL", 80000],
  ["Isha Sen", "E-commerce launch", "CONTACTED", "CALL", 65000],
  ["Rohan Shah", "Analytics dashboard", "CONTACTED", "WHATSAPP", 38000],
  ["Tara Bose", "Brand landing page", "CONTACTED", "WEBSITE_FORM", 22000],
  ["Nikhil Jain", "Sales automation", "QUOTE_SENT", "REFERRAL", 95000],
  ["Meera Joshi", "Booking platform", "QUOTE_SENT", "CALL", 72000],
  ["Vihaan Roy", "CRM integration", "QUOTE_SENT", "INSTAGRAM", 55000],
  ["Anaya Sethi", "Business website", "WON", "REFERRAL", 48000],
  ["Arjun Das", "Client reporting portal", "WON", "WEBSITE_FORM", 88000],
  ["Sana Ali", "Support dashboard", "WON", "CALL", 42000],
  ["Reyansh Khanna", "Store migration", "LOST", "OTHER", 30000],
  ["Myra Anand", "Campaign microsite", "LOST", "INSTAGRAM", 18000],
] as const;

/** An opaque, unguessable cookie grants access to a single disposable workspace.
 * No Better Auth account/password exists for these synthetic users. */
export async function createDemo() {
  const token = randomBytes(32).toString("hex");
  const hash = digest(token), userId = USER_PREFIX + hash, businessId = BUSINESS_PREFIX + hash;
  const now = new Date(), cutoff = new Date(now.getTime() - DEMO_TTL * 1000);
  await prisma.$transaction(async tx => {
    // Serialise allocation and cleanup across server instances, and cap storage.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(724831)::text AS locked`;
    const stale = await tx.business.findMany({ where: { id: { startsWith: BUSINESS_PREFIX }, createdAt: { lt: cutoff } }, select: { id: true }, take: 20 });
    for (const { id } of stale) {
      await tx.lead.deleteMany({ where: { businessId: id } });
      await tx.business.delete({ where: { id } });
      await tx.user.deleteMany({ where: { id: USER_PREFIX + id.slice(BUSINESS_PREFIX.length), email: { endsWith: "@demo.leadloop.example" } } });
    }
    if (await tx.business.count({ where: { id: { startsWith: BUSINESS_PREFIX } } }) >= 80) {
      throw new ApiError(503, "DEMO_BUSY", "The demo is busy. Please try again shortly.");
    }
    await tx.user.create({ data: { id: userId, name: "Demo Owner", email: `visitor-${hash}@demo.leadloop.example`, emailVerified: true } });
    await tx.business.create({ data: { id: businessId, name: "Studio North · Demo", slug: `demo-${hash}` } });
    await tx.membership.create({ data: { userId, businessId, role: "OWNER" } });
    await tx.contact.createMany({ data: sample.map(([name], i) => ({ id: `${businessId}-contact-${i}`, businessId, name, email: `contact${i + 1}@example.test` })) });
    await tx.lead.createMany({ data: sample.map(([, title, stage, source, rupees], i) => ({
      id: `${businessId}-lead-${i}`, businessId, contactId: `${businessId}-contact-${i}`, title, stage, source,
      valueMinor: rupees * 100, assignedToId: i % 5 === 0 ? null : userId, createdById: userId,
      interest: "Illustrative customer enquiry for the demo workspace.",
      createdAt: new Date(now.getTime() - i * 43_200_000),
      closedAt: stage === "WON" || stage === "LOST" ? now : null,
      lostReason: stage === "LOST" ? "Budget or timeline changed" : null,
    })) });
    await tx.leadTask.createMany({ data: sample.slice(0, 9).map(([, title], i) => ({
      businessId, leadId: `${businessId}-lead-${i}`, assignedToId: userId,
      title: i % 2 === 0 ? "Schedule discovery call" : `Follow up: ${title}`, type: i % 2 === 0 ? "CALL" : "EMAIL",
      dueAt: new Date(now.getTime() + (i - 3) * 7_200_000), status: i === 8 ? "DONE" : "OPEN", completedAt: i === 8 ? now : null,
    })) });
    await tx.note.createMany({ data: sample.map(([, title], i) => ({
      businessId, leadId: `${businessId}-lead-${i}`, authorId: userId, body: `Sample interaction: discussed requirements for ${title}.`, type: "NOTE",
    })) });
    await tx.leadEvent.createMany({ data: sample.map(([, , stage], i) => ({
      businessId, leadId: `${businessId}-lead-${i}`, actorId: userId, action: "CREATED", toValue: stage,
    })) });
  }, { timeout: 20000 });
  return token;
}
