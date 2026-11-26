import { test } from "@playwright/test";
import { login, expect } from "./helpers";
test("online delivery order → assign rider → rider delivers → customer tracking", async ({ browser, request }) => {
  const cust = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await cust.goto("/o/demo");
  await cust.getByLabel("Add Butter Naan").click();
  await cust.getByLabel("Add Dal Makhani").click();
  await cust.getByRole("button", { name: /Checkout/ }).click();
  await cust.getByPlaceholder("Name").fill("Asha");
  await cust.getByPlaceholder("Phone").fill("9876543210");
  await cust.getByPlaceholder("Full address").fill("Flat 4, Road 2");
  await cust.getByPlaceholder("Pincode").fill("500034");
  await expect(cust.getByText(/Delivery ₹20.00/)).toBeVisible();
  await cust.getByRole("button", { name: "Place order" }).click();
  await expect(cust.getByText(/Order placed!/)).toBeVisible();
  await cust.getByText("Track your order").click();
  await expect(cust.getByText("Order received")).toBeVisible();

  const mgr = await browser.newPage(); await login(mgr, "manager@demo.com");
  await mgr.goto("/deliveries");
  await mgr.getByRole("row").filter({ hasText: "Asha" }).first().getByRole("combobox").selectOption({ label: "Suresh Rider" });
  await expect(mgr.getByText("Rider assigned")).toBeVisible();

  const rider = await browser.newPage(); await login(rider, "rider@demo.com");
  await rider.goto("/rider");
  const card = rider.locator(".card").filter({ hasText: "Asha" }).first();
  await card.getByRole("button", { name: "Picked up from restaurant" }).click();
  await card.getByRole("button", { name: "Start ride" }).click();
  await card.getByRole("button", { name: "Delivered" }).click();
  await expect(cust.getByText("Rider: Suresh Rider")).toBeVisible({ timeout: 25000 });
});
test("online table booking", async ({ page }) => {
  await page.goto("/book/demo");
  await page.locator("input[name=name]").fill("Ravi K");
  await page.locator("input[name=phone]").fill("9123456780");
  await page.getByRole("button", { name: "Book" }).click();
  await expect(page.getByText("Your table is booked")).toBeVisible();
});
