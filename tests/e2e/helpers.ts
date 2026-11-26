import { Page, expect } from "@playwright/test";
export async function login(page: Page, email = "owner@demo.com") {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click("button:has-text('Log in')");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}
export { expect };
