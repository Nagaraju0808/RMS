import { test } from "@playwright/test";
import { login, expect } from "./helpers";
test("manager creates a menu item and toggles stock", async ({ page }) => {
  await login(page, "manager@demo.com");
  await page.goto("/menu");
  await expect(page.getByText("Masala Dosa")).toBeVisible();
  await page.click("text=+ New item");
  const name = "E2E Pongal " + Date.now();
  await page.fill("#iname", name);
  await page.fill("#pdi", "95");
  await page.click("text=Save item");
  await expect(page.getByText(name)).toBeVisible();
  await page.getByLabel(`Toggle stock ${name}`).click();
  await expect(page.getByLabel(`Toggle stock ${name}`)).toHaveText("Out of stock");
});
