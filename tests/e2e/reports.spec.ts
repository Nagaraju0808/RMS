import { test } from "@playwright/test";
import { login, expect } from "./helpers";
test("owner sees dashboard and reports, exports Excel and PDF", async ({ page }) => {
  await login(page, "owner@demo.com");
  await page.goto("/dashboard");
  await expect(page.getByText("Sales today")).toBeVisible();
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Sales by day" })).toBeVisible();
  await page.getByRole("tab", { name: "GST" }).click();
  await expect(page.getByRole("heading", { name: /GST summary/ })).toBeVisible();
  await expect(page.getByText("5%").first()).toBeVisible();
  const xlsx = await page.request.get("/api/reports/items?format=xlsx"); expect(xlsx.status()).toBe(200);
  const pdf = await page.request.get("/api/reports/profit?format=pdf"); expect(pdf.headers()["content-type"]).toContain("pdf");
});
test("waiter cannot open reports API", async ({ page }) => {
  await login(page, "waiter@demo.com");
  expect((await page.request.get("/api/reports/sales")).status()).toBe(403);
});
