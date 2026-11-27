import { expect, test } from "@playwright/test";

test("Try Demo signs out an existing account and retries once", async ({ page }) => {
  const calls: string[] = [];
  await page.route("**/api/demo", async route => {
    calls.push("demo");
    if (calls.length === 1) {
      await route.fulfill({ status: 409, json: { error: { code: "SIGNED_IN", message: "Sign out of your account before entering the demo." } } });
    } else {
      await route.fulfill({ status: 201, json: { data: { ready: true } } });
    }
  });
  await page.route("**/api/auth/sign-out", async route => {
    calls.push("sign-out");
    await route.fulfill({ status: 200, json: { success: true } });
  });
  await page.route("**/dashboard", route => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Demo dashboard</h1>" }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Try Demo" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(calls).toEqual(["demo", "sign-out", "demo"]);
});

test("Try Demo does not retry if signing out fails", async ({ page }) => {
  let demoRequests = 0;
  await page.route("**/api/demo", async route => {
    demoRequests++;
    await route.fulfill({ status: 409, json: { error: { code: "SIGNED_IN", message: "Sign out of your account before entering the demo." } } });
  });
  await page.route("**/api/auth/sign-out", route => route.fulfill({
    status: 500, json: { code: "SIGN_OUT_FAILED", message: "Unable to sign out" },
  }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Try Demo" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(demoRequests).toBe(1);
});

test("Try Demo starts directly for signed-out visitors", async ({ page }) => {
  let signOutRequests = 0;
  await page.route("**/api/auth/sign-out", async route => {
    signOutRequests++;
    await route.fulfill({ status: 200, json: { success: true } });
  });
  await page.route("**/api/demo", route => route.fulfill({ status: 201, json: { data: { ready: true } } }));
  await page.route("**/dashboard", route => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Demo dashboard</h1>" }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Try Demo" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(signOutRequests).toBe(0);
});
