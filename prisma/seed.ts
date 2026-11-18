import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // Seed is intentionally non-destructive and creates no known-password accounts.
  // Create a real, verified owner through signup, then run this script to populate demo leads.
  const business = await prisma.business.findFirst({ where: { memberships: { some: { role: "OWNER" } } } });
  if (!business) { console.log("No owner workspace found. Sign up and onboard before seeding."); return; }
  const owner = await prisma.membership.findFirstOrThrow({ where: { businessId: business.id, role: "OWNER" } });
  const count = await prisma.lead.count({ where: { businessId: business.id } });
  if (count) { console.log("Workspace already has leads; skipping seed."); return; }
  const leads = [
    ["Ananya Gupta", "ananya@example.test", "Corporate lunch subscription", "QUOTE_SENT", "REFERRAL", 240000],
    ["Rohit Verma", "rohit@example.test", "Office meal plan", "CONTACTED", "INSTAGRAM", 180000],
    ["Priya Sharma", "priya@example.test", "Monthly tiffin enquiry", "NEW", "WEBSITE_FORM", 99000],
    ["Karan Mehta", "karan@example.test", "Family catering enquiry", "WON", "CALL", 650000],
    ["Meera Saini", "meera@example.test", "Weekly dinner plan", "LOST", "WHATSAPP", 150000],
  ] as const;
  for (const [name, email, title, stage, source, valueMinor] of leads) {
    const contact = await prisma.contact.create({ data: { businessId: business.id, name, email } });
    const lead = await prisma.lead.create({ data: { businessId: business.id, contactId: contact.id, title, stage, source, valueMinor, assignedToId: owner.userId, createdById: owner.userId, closedAt: stage === "WON" || stage === "LOST" ? new Date() : null, lostReason: stage === "LOST" ? "Requested an unavailable delivery slot" : null } });
    await prisma.leadEvent.create({ data: { businessId: business.id, leadId: lead.id, actorId: owner.userId, action: "CREATED" } });
    await prisma.leadTask.create({ data: { businessId: business.id, leadId: lead.id, assignedToId: owner.userId, title: "Check in with customer", type: "CALL", dueAt: new Date(Date.now() + (stage === "NEW" ? -1 : 1) * 86400000) } });
  }
  console.log(`Seeded ${leads.length} demo leads for ${business.name}`);
}
main().finally(() => prisma.$disconnect());
