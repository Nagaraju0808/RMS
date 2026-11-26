import { test } from "@playwright/test";
import { login, expect } from "./helpers";

test("POS keeps taking orders offline and sends each exactly once when back online", async ({ page, context }) => {
  await login(page, "cashier@demo.com");
  await page.goto("/pos");
  await expect(page.getByRole("button", { name: /Masala Dosa/ })).toBeVisible();
  const count = async () => (await (await page.request.get("/api/orders?type=TAKEAWAY&limit=500")).json()).length;
  const before = await count();

  await context.setOffline(true);
  await page.getByRole("button", { name: "TAKEAWAY" }).click();
  await page.getByRole("button", { name: /Butter Naan/ }).click();
  await page.getByRole("button", { name: "Send KOT" }).click();
  await expect(page.getByText(/order saved on this device/)).toBeVisible();
  await expect(page.getByText(/1 change is saved on this device/)).toBeVisible();
  // the same screen keeps working for the next order
  await page.getByRole("button", { name: "TAKEAWAY" }).click();
  await page.getByRole("button", { name: /Tandoori Roti/ }).click();
  await page.getByRole("button", { name: "Send KOT" }).click();
  await expect(page.getByText(/2 changes are saved on this device/)).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(/saved on this device/)).toHaveCount(0, { timeout: 30000 });
  expect(await count()).toBe(before + 2);
  // a second sync attempt must not create duplicates
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(1500);
  expect(await count()).toBe(before + 2);
});

