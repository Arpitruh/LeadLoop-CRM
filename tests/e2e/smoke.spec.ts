import { test, expect } from "@playwright/test";

test("landing page exposes signup", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Great leads deserve/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Get started/i })).toBeVisible();
});

test("login form has accessible fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("textbox", { name: "Email address" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
});

test("health endpoints respond without leaking database details", async ({ request }) => {
  const live = await request.get("/api/health/live");
  const ready = await request.get("/api/health/ready");
  expect(live.ok()).toBe(true);
  expect((await live.json()).status).toBe("ok");
  expect(ready.ok()).toBe(true);
  expect(await ready.json()).toEqual({ status: "ready" });
});

test("unauthenticated lead read is rejected", async ({ request }) => {
  const response = await request.get("/api/v1/leads");
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
});
