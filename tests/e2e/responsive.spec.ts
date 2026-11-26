import { test, expect, type Page } from "@playwright/test";

const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
async function checkField(page: Page, id: string) {
  const input = page.locator(id);
  await expect(input).toBeVisible();
  const layout = await input.evaluate(el => {
    const icon = el.parentElement!.querySelector("svg")!;
    const a = el.getBoundingClientRect(), b = icon.getBoundingClientRect();
    return { gap: a.left + parseFloat(getComputedStyle(el).paddingLeft) - b.right,
      centerDifference: Math.abs((a.top + a.bottom - b.top - b.bottom) / 2) };
  });
  expect(layout.gap).toBeGreaterThanOrEqual(8);
  expect(layout.centerDifference).toBeLessThanOrEqual(2);
}
async function checkOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `Overflow at ${page.url()} width ${page.viewportSize()?.width}`).toBeLessThanOrEqual(1);
}
test("responsive form spacing and route-aware header", async ({ page }) => {
  test.setTimeout(180_000);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/login", "/signup", "/forgot-password", "/reset-password"]) {
      await page.goto(path);
      if (path === "/signup") await checkField(page, "#name");
      if (path !== "/reset-password") await checkField(page, "#email");
      if (path !== "/forgot-password") await checkField(page, "#password");
      await checkOverflow(page);
    }
    await page.goto("/");
    await checkOverflow(page);
  }
  await page.goto("/login");
  await page.getByRole("button", { name: "Try Demo" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/leads");
    await checkField(page, "#q");
    await checkOverflow(page);
    const quickAdd = page.locator("header").getByRole("link", { name: "New lead" });
    await expect(quickAdd).toBeVisible();
    await quickAdd.click();
    await expect(page).toHaveURL(/\/leads\/new$/);
    await expect(quickAdd).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create lead" })).toBeVisible();
    await checkOverflow(page);
    for (const path of ["/dashboard", "/board", "/tasks", "/reports", "/team", "/settings"]) {
      await page.goto(path);
      await checkOverflow(page);
    }
    await expect(quickAdd).toBeVisible();
  }
  await page.request.delete("/api/demo");
});
