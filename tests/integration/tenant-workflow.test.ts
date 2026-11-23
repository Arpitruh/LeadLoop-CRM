/** Real Postgres/Prisma tests. Run against an isolated disposable test database only. */
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tenant", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/tenant")>();
  return { ...original, requireWorkspace: vi.fn() };
});

import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/tenant";
import { createLeadRecord } from "@/lib/lead-service";
import { createLeadSchema } from "@/lib/validation";
import { GET as listLeads, POST as addLead } from "@/app/api/v1/leads/route";
import { GET as getLead, PATCH as editLead } from "@/app/api/v1/leads/[id]/route";
import { PATCH as moveStage } from "@/app/api/v1/leads/[id]/stage/route";
import { GET as getContact } from "@/app/api/v1/contacts/[id]/route";
import { POST as publicEnquiry } from "@/app/api/v1/public/enquiries/route";
import { GET as listTasks, POST as addTask } from "@/app/api/v1/tasks/route";
import { GET as listTeam, POST as inviteTeam } from "@/app/api/v1/team/invitations/route";
import { PATCH as changeSettings } from "@/app/api/v1/settings/route";
import { PATCH as editTask } from "@/app/api/v1/tasks/[id]/route";
import { POST as partnerEnquiry } from "@/app/api/v1/integrations/sisters-magical-spoon/route";
import { signPayload } from "@/lib/signature";

const run = randomUUID().replaceAll("-", "");
const aId = `test-business-a-${run}`, bId = `test-business-b-${run}`;
const ownerA = `test-owner-a-${run}`, staffA = `test-staff-a-${run}`;
const staffB = `test-staff-b-${run}`, ownerB = `test-owner-b-${run}`;
const memberships: Record<string, Awaited<ReturnType<typeof prisma.membership.create>>> = {};
let primaryLeadId = "", foreignLeadId = "", foreignContactId = "", otherTaskId = "";
let currentUser = ownerA;
let currentBusiness = aId;
const secret = "test-integration-secret-at-least-thirty-two-characters";
const user = (id: string) => ({ id, name: id, email: `${id}@example.test`, emailVerified: true });
const makeRequest = (path: string, method = "GET", body?: object) => new Request(`http://localhost:3000${path}`, {
  method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
});
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function select(business: string, userId: string) {
  currentUser = userId;
  currentBusiness = business;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL || process.env.ALLOW_DB_INTEGRATION_TESTS !== "1") {
    throw new Error("Set ALLOW_DB_INTEGRATION_TESTS=1 with a disposable DATABASE_URL to run integration tests");
  }
  if (/prod|production/i.test(new URL(process.env.DATABASE_URL).pathname)) {
    throw new Error("Refusing to run integration tests against a production-named database");
  }
  process.env.SISTERS_CRM_SECRET = secret;
  process.env.SISTERS_BUSINESS_ID = aId;
  vi.mocked(requireWorkspace).mockImplementation(async () => ({
    user: user(currentUser), membership: memberships[`${currentBusiness}:${currentUser}`],
    businessId: currentBusiness, role: memberships[`${currentBusiness}:${currentUser}`].role,
  }) as never);
  await prisma.user.createMany({ data: [ownerA, ownerB, staffA, staffB].map(id => user(id)) });
  await prisma.business.createMany({ data: [
    { id: aId, name: "Fixture A", slug: `fixture-a-${run}`, timezone: "Asia/Kolkata", currencyCode: "INR" },
    { id: bId, name: "Fixture B", slug: `fixture-b-${run}`, timezone: "Asia/Kolkata", currencyCode: "INR" },
  ] });
  for (const [bid, uid, role] of [[aId, ownerA, "OWNER"], [aId, staffA, "STAFF"], [aId, staffB, "STAFF"], [bId, ownerB, "OWNER"]] as const) {
    memberships[`${bid}:${uid}`] = await prisma.membership.create({ data: { businessId: bid, userId: uid, role } });
  }
  const leadA = await createLeadRecord({ businessId: aId, userId: ownerA, currencyCode: "INR", input: createLeadSchema.parse({
    name: "Customer A", email: `client-a-${run}@example.test`, title: "Proposal A", source: "REFERRAL", assignedToId: staffA,
  }) });
  const leadB = await createLeadRecord({ businessId: bId, userId: ownerB, currencyCode: "INR", input: createLeadSchema.parse({
    name: "Customer B", email: `client-b-${run}@example.test`, title: "Proposal B", source: "CALL", assignedToId: ownerB,
  }) });
  primaryLeadId = leadA.id; foreignLeadId = leadB.id;
  foreignContactId = (await prisma.lead.findUniqueOrThrow({ where: { id: foreignLeadId } })).contactId;
  const task = await prisma.leadTask.create({ data: {
    businessId: aId, leadId: primaryLeadId, assignedToId: staffB, title: "Another person's task", dueAt: new Date(Date.now() - 60_000),
  } });
  otherTaskId = task.id;
});

afterAll(async () => {
  await prisma.business.deleteMany({ where: { id: { in: [aId, bId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerA, ownerB, staffA, staffB] } } });
  await prisma.$disconnect();
});

describe("workspace isolation and business workflows", () => {
  it("lists only leads belonging to the active tenant", async () => {
    select(aId, ownerA);
    const response = await listLeads(makeRequest("/api/v1/leads"));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.data.some((lead: { id: string }) => lead.id === primaryLeadId)).toBe(true);
    expect(result.data.some((lead: { id: string }) => lead.id === foreignLeadId)).toBe(false);
  });
  it("creates a lead, normalizes its contact and schedules a follow-up transactionally", async () => {
    select(aId, ownerA);
    const dueAt = new Date(Date.now() + 2 * 86400000).toISOString();
    const response = await addLead(makeRequest("/api/v1/leads", "POST", {
      name: "New Client", phone: "9876543210", title: "Book a demo",
      source: "CALL", assignedToId: staffA, dueAt, consent: true,
    }));
    expect(response.status).toBe(201);
    const { data } = await response.json();
    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: data.id },
      include: { contact: true, tasks: true, events: true },
    });
    expect(lead.businessId).toBe(aId);
    expect(lead.assignedToId).toBe(staffA);
    expect(lead.contact.phoneE164).toBe("+919876543210");
    expect(lead.tasks).toHaveLength(1);
    expect(lead.tasks[0]?.assignedToId).toBe(staffA);
    expect(lead.events.filter(x => x.action === "CREATED")).toHaveLength(1);
  });
  it("prevents staff from assigning newly created leads to a teammate", async () => {
    select(aId, staffA);
    const response = await addLead(makeRequest("/api/v1/leads", "POST", {
      name: "Private Client", email: `private-${run}@example.test`,
      title: "Assignment bypass attempt", assignedToId: staffB, source: "CALL",
    }));
    expect(response.status).toBe(403);
    const found = await prisma.lead.count({ where: { businessId: aId, title: "Assignment bypass attempt" } });
    expect(found).toBe(0);
  });
  it("creates follow-up tasks only for accessible leads and workspace members", async () => {
    select(aId, ownerA);
    const dueAt = new Date(Date.now() + 86400000).toISOString();
    const cross = await addTask(makeRequest("/api/v1/tasks", "POST", {
      leadId: foreignLeadId, title: "Cross-workspace task", dueAt,
    }));
    expect(cross.status).toBe(404);
    const valid = await addTask(makeRequest("/api/v1/tasks", "POST", {
      leadId: primaryLeadId, title: "Call with owner", dueAt, assignedToId: ownerA,
    }));
    expect(valid.status).toBe(201);
    const { data } = await valid.json();
    expect(data.businessId).toBe(aId);
    expect(data.assignedToId).toBe(ownerA);
    const result = await editTask(makeRequest(`/api/v1/tasks/${data.id}`, "PATCH", {
      status: "DONE",
    }), ctx(data.id));
    expect(result.status).toBe(200);
    const saved = await prisma.leadTask.findUniqueOrThrow({ where: { id: data.id } });
    expect(saved.status).toBe("DONE");
    expect(saved.completedAt).not.toBeNull();
  });
  it("cannot read or patch a known foreign lead ID", async () => {
    select(aId, ownerA);
    const response = await getLead(makeRequest(`/api/v1/leads/${foreignLeadId}`), ctx(foreignLeadId));
    const patch = await editLead(makeRequest(`/api/v1/leads/${foreignLeadId}`, "PATCH", { title: "Cross tenant!" }), ctx(foreignLeadId));
    expect(response.status).toBe(404);
    expect(patch.status).toBe(404);
  });
  it("cannot read a known foreign contact ID", async () => {
    select(aId, ownerA);
    expect((await getContact(makeRequest(`/api/v1/contacts/${foreignContactId}`), ctx(foreignContactId))).status).toBe(404);
  });
  it("public forms create only in their selected workspace and honeypot does not create leads", async () => {
    const form = await prisma.publicForm.create({ data: { businessId: bId, publicKey: `form-key-${run}` } });
    const data = { publicKey: form.publicKey, name: "Public Person", email: `public-${run}@example.test`, interest: "Dinner enquiry", consent: true, externalSubmissionId: randomUUID() };
    const first = await publicEnquiry(makeRequest("/api/v1/public/enquiries", "POST", data));
    expect(first.status).toBe(201);
    const repeat = await publicEnquiry(makeRequest("/api/v1/public/enquiries", "POST", data));
    expect(repeat.status).toBe(200);
    expect(await prisma.formSubmission.count({ where: { businessId: bId, externalSubmissionId: `public:${form.id}:${data.externalSubmissionId}` } })).toBe(1);
    const before = await prisma.lead.count({ where: { businessId: bId } });
    expect((await publicEnquiry(makeRequest("/api/v1/public/enquiries", "POST", { ...data, externalSubmissionId: randomUUID(), website: "https://spam.test" }))).status).toBe(202);
    expect(await prisma.lead.count({ where: { businessId: bId } })).toBe(before);
    expect((await publicEnquiry(makeRequest("/api/v1/public/enquiries", "POST", { ...data, consent: false }))).status).toBe(400);
  });
  it("staff sees only own assigned leads and not a teammate's task", async () => {
    select(aId, staffA);
    const leads = await (await listLeads(makeRequest("/api/v1/leads"))).json();
    expect(leads.data.every((lead: { assignedToId: string }) => lead.assignedToId === staffA)).toBe(true);
    const tasks = await (await listTasks()).json();
    expect(tasks.data.some((task: { id: string }) => task.id === otherTaskId)).toBe(false);
    const response = await editTask(makeRequest(`/api/v1/tasks/${otherTaskId}`, "PATCH", { status: "DONE" }), ctx(otherTaskId));
    expect(response.status).toBe(404);
    expect((await prisma.leadTask.findUniqueOrThrow({ where: { id: otherTaskId } })).status).toBe("OPEN");
  });
  it("denies staff access to owner-only team APIs and workspace settings changes", async () => {
    select(aId, staffA);
    const listResponse = await listTeam();
    expect(listResponse.status).toBe(403);
    const inviteResponse = await inviteTeam(makeRequest("/api/v1/team/invitations", "POST", {
      email: "unauthorized-invite@example.test",
    }));
    expect(inviteResponse.status).toBe(403);
    expect(await prisma.invitation.count({
      where: { businessId: aId, invitedEmail: "unauthorized-invite@example.test" },
    })).toBe(0);
    const settingsResponse = await changeSettings(makeRequest("/api/v1/settings", "PATCH", {
      name: "Unauthorized Rename",
    }));
    expect(settingsResponse.status).toBe(403);
    expect((await prisma.business.findUniqueOrThrow({ where: { id: aId } })).name).toBe("Fixture A");
  });
  it("does not expose other workspaces or coworkers' leads to staff", async () => {
    select(aId, staffB);
    const list = await listLeads(makeRequest("/api/v1/leads"));
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.data.some((lead: { id: string }) => lead.id === primaryLeadId)).toBe(false);
    expect(body.data.some((lead: { id: string }) => lead.id === foreignLeadId)).toBe(false);
    expect((await getLead(makeRequest(`/api/v1/leads/${primaryLeadId}`), ctx(primaryLeadId))).status).toBe(404);
    expect((await getLead(makeRequest(`/api/v1/leads/${foreignLeadId}`), ctx(foreignLeadId))).status).toBe(404);
  });
  it("records exactly one event for a stage change, and no event for replay", async () => {
    select(aId, staffA);
    const request = () => makeRequest(`/api/v1/leads/${primaryLeadId}/stage`, "PATCH", { stage: "CONTACTED" });
    const before = await prisma.leadEvent.count({ where: { leadId: primaryLeadId, action: "STAGE_CHANGED" } });
    expect((await moveStage(request(), ctx(primaryLeadId))).status).toBe(200);
    expect((await moveStage(request(), ctx(primaryLeadId))).status).toBe(200);
    const after = await prisma.leadEvent.count({ where: { leadId: primaryLeadId, action: "STAGE_CHANGED" } });
    expect(after - before).toBe(1);
  });
  it("rejects LOST without a reason and WON without a value", async () => {
    select(aId, staffA);
    expect((await moveStage(makeRequest(`/api/v1/leads/${primaryLeadId}/stage`, "PATCH", { stage: "LOST" }), ctx(primaryLeadId))).status).toBe(400);
    expect((await moveStage(makeRequest(`/api/v1/leads/${primaryLeadId}/stage`, "PATCH", { stage: "WON" }), ctx(primaryLeadId))).status).toBe(400);
  });
  it("accepts a signed partner submission once across repeated retries", async () => {
    const payload = JSON.stringify({ externalSubmissionId: `test-${run}`, name: "Test Customer", phone: "9876543210", pincode: "201301", consent: true });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signedReq = (raw = payload, signature = `sha256=${signPayload(secret, timestamp, payload)}`) => new Request(
      "http://localhost:3000/api/v1/integrations/sisters-magical-spoon", {
        method: "POST", headers: { "content-type": "application/json", "x-leadloop-timestamp": timestamp, "x-leadloop-signature": signature }, body: raw,
      });
    const first = await partnerEnquiry(signedReq());
    expect(first.status).toBe(201);
    for (let i = 0; i < 5; i++) {
      const retry = await partnerEnquiry(signedReq());
      expect(retry.status).toBe(200);
      expect((await retry.json()).data.duplicate).toBe(true);
    }
    expect(await prisma.formSubmission.count({ where: { businessId: aId, externalSubmissionId: `sisters:test-${run}` } })).toBe(1);
    expect((await partnerEnquiry(signedReq(payload + " "))).status).toBe(401);
  });
});
