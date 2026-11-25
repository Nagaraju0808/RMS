import { test, expect } from "@playwright/test";
test("owner logs in with email and sees sidebar", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "owner@demo.com");
  await page.fill("#password", "password123");
  await page.click("button:has-text('Log in')");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Settings" })).toBeVisible();
});
test("chef logs in with PIN and lands on kitchen", async ({ page }) => {
  await page.goto("/login");
  await page.click("text=Staff PIN");
  for (const d of "5555") await page.getByRole("button", { name: d, exact: true }).click();
  await page.waitForURL("**/kitchen");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Settings" })).toHaveCount(0);
});
