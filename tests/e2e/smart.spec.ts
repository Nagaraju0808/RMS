import { test } from "@playwright/test";
import { login, expect } from "./helpers";
test("smart insights work with AI off (fallbacks)", async ({ page }) => {
  await login(page, "owner@demo.com");
  await page.goto("/smart");
  await expect(page.getByText("Dishes expected per day")).toBeVisible();
  await expect(page.getByText(/AI is off/)).toBeVisible();
  await page.getByRole("button", { name: "What to buy" }).click();
  await expect(page.getByRole("columnheader", { name: "Order" })).toBeVisible();
  await page.getByRole("button", { name: "Review summary" }).click();
  await expect(page.getByText("What customers talk about")).toBeVisible();
});
test("voice order fills the cart for the waiter to confirm", async ({ page }) => {
  await page.addInitScript(() => { delete (window as any).webkitSpeechRecognition; delete (window as any).SpeechRecognition; });
  await login(page, "cashier@demo.com");
  await page.goto("/pos");
  page.once("dialog", (d) => d.accept("two butter naan and one dal makhani"));
  await page.getByRole("button", { name: "Voice order" }).click();
  await expect(page.getByText("2 × Butter Naan")).toBeVisible();
  await page.getByRole("button", { name: "Add to order" }).click();
  await expect(page.getByText(/check and press Send KOT/)).toBeVisible();
});
