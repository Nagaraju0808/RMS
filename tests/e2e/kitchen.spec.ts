import { test } from "@playwright/test";
import { login, expect } from "./helpers";
test("order sent from POS appears live on kitchen screen and can be marked ready", async ({ browser }) => {
  const chef = await browser.newPage(); await login(chef, "chef@demo.com"); await chef.goto("/kitchen");
  await expect(chef.getByRole("heading", { name: "Kitchen" })).toBeVisible();
  const before = await chef.getByTestId("kot").count();
  const cashier = await browser.newPage(); await login(cashier, "cashier@demo.com"); await cashier.goto("/pos");
  await cashier.getByRole("button", { name: "TAKEAWAY" }).click();
  await cashier.getByRole("button", { name: /Veg Fried Rice/ }).click();
  await cashier.getByRole("button", { name: "Send KOT" }).click();
  await expect(cashier.getByText(/KOT sent/)).toBeVisible();
  await expect(chef.getByTestId("kot")).toHaveCount(before + 1, { timeout: 15000 }); // arrives live via Socket.IO
  const card = chef.getByTestId("kot").filter({ hasText: "Veg Fried Rice" }).last();
  await card.getByRole("button", { name: "All ready" }).click();
  await expect(chef.getByRole("heading", { name: /Ready/ })).toBeVisible();
  await expect(cashier.getByRole("alert").filter({ hasText: "Ready" })).toBeVisible({ timeout: 15000 }); // waiter/cashier alert
});
