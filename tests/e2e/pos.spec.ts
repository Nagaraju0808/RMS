import { test } from "@playwright/test";
import { login, expect } from "./helpers";
test("cashier takes a takeaway order and sends KOT", async ({ page }) => {
  await login(page, "cashier@demo.com");
  await page.goto("/pos");
  await page.getByRole("button", { name: "TAKEAWAY" }).click();
  await page.getByRole("button", { name: /Butter Naan/ }).click();
  await page.getByRole("button", { name: /Butter Naan/ }).click();
  await page.getByRole("button", { name: /Paneer Tikka/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Half/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Add/ }).click();
  await expect(page.getByTestId("total")).not.toHaveText("₹0.00");
  await page.getByRole("button", { name: "Send KOT" }).click();
  await expect(page.getByText(/KOT sent/)).toBeVisible();
  await expect(page.getByText(/Order #\d+/)).toBeVisible();
});
test("waiter opens a table on phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await login(page, "waiter@demo.com");
  await page.goto("/waiter");
  await page.getByRole("button", { name: /^T5/ }).click();
  await page.getByRole("button", { name: /Dal Makhani/ }).click();
  await page.getByRole("button", { name: /View order/ }).click();
  await page.getByRole("button", { name: "Send KOT" }).click();
  await expect(page.getByText(/KOT sent/)).toBeVisible();
});
