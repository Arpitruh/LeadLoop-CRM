import { test, expect } from "@playwright/test";

test("demo is populated, isolated, and cannot invite or change settings", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  try {
    const page = await a.newPage();
    await page.goto("/login");
    await page.getByRole("button", { name: "Try Demo" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Demo workspace", { exact: true })).toBeVisible();
    const leads = await a.request.get("/api/v1/leads");
    expect(leads.ok()).toBeTruthy();
    const first = (await leads.json()).data;
    expect(first).toHaveLength(14);
    expect(await (await b.request.post("/api/demo")).status()).toBe(201);
    const second = (await (await b.request.get("/api/v1/leads")).json()).data;
    expect(second).toHaveLength(14);
    expect(second[0].businessId).not.toEqual(first[0].businessId);
    expect((await b.request.get(`/api/v1/leads/${first[0].id}`)).status()).toBe(404);
    expect((await a.request.post("/api/v1/team/invitations", { data: { email: "test@example.test" } })).status()).toBe(403);
    expect((await a.request.patch("/api/v1/settings", { data: { name: "Changed" } })).status()).toBe(403);
    expect((await a.request.post("/api/v1/workspace", { data: { name: "New workspace", slug: "new-workspace" } })).status()).toBe(403);
    const changed = await a.request.patch(`/api/v1/leads/${first[0].id}`, { data: { title: "Only in my demo" } });
    expect(changed.ok()).toBeTruthy();
    expect((await (await b.request.get("/api/v1/leads")).json()).data[0].title).not.toEqual("Only in my demo");
    const oldCookie = (await a.cookies()).find(c => c.name === "ll_demo")!;
    await a.request.delete("/api/demo");
    expect((await a.request.get("/api/v1/leads")).status()).toBe(401);
    await a.addCookies([oldCookie]);
    expect((await a.request.get("/api/v1/leads")).status()).toBe(401);
    expect((await a.request.post("/api/demo")).status()).toBe(201);
    const fresh = (await (await a.request.get("/api/v1/leads")).json()).data;
    expect(fresh).toHaveLength(14);
    expect(fresh[0].title).not.toEqual("Only in my demo");
  } finally {
    await a.close();
    await b.close();
  }
});
