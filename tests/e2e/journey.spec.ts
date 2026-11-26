import { test, expect } from "@playwright/test";

// The full story from the plan, on a brand-new restaurant:
// owner signs up → setup wizard → adds a menu item → staff takes an order → kitchen marks it ready → bill → payment → report.
test("owner setup → menu → order → kitchen → bill → payment → report", async ({ browser }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const owner = await (await browser.newContext()).newPage();

  // 1. Sign up and run the setup wizard (quick-service café: tokens on, tables off)
  await owner.goto("/signup");
  await owner.fill("#rn", `Journey Cafe ${stamp}`);
  await owner.fill("#on", "Priya Owner");
  await owner.fill("#em", `owner${stamp}@journey.test`);
  await owner.fill("#pw", "password123");
  await owner.fill("#pin", "4321");
  await owner.getByRole("button", { name: "Create" }).click();
  await owner.waitForURL("**/onboarding");
  await owner.getByRole("button", { name: "Next", exact: true }).click();                      // restaurant name
  await owner.getByRole("button", { name: "Quick service / fast food" }).click();
  await expect(owner.getByText(/tokens/)).toBeVisible();
  await owner.getByRole("button", { name: "Next", exact: true }).click();                      // type
  await owner.getByRole("button", { name: "Next", exact: true }).click();                      // branches
  await owner.getByRole("button", { name: "Next", exact: true }).click();                      // tax 5%
  await owner.getByRole("button", { name: "Finish setup" }).click();
  await owner.waitForURL("**/menu");

  // 2. Menu: a category, a kitchen station and an item
  await owner.getByRole("tab", { name: "Categories" }).click();
  await owner.getByPlaceholder("New category").fill("Snacks");
  await owner.getByRole("button", { name: "Add", exact: true }).click();
  await expect(owner.getByText("Snacks", { exact: true })).toBeVisible();
  await owner.getByRole("tab", { name: "Items" }).click();
  await owner.getByRole("button", { name: "+ New item" }).click();
  await owner.fill("#iname", "Samosa Plate");
  await owner.fill("#pdi", "100");
  await owner.getByRole("button", { name: "Save item" }).click();
  await expect(owner.getByText("Samosa Plate")).toBeVisible();

  // 3. Order at the POS (takeaway gets a token number), sent to the kitchen
  await owner.goto("/pos");
  await owner.getByRole("button", { name: /Samosa Plate/ }).click();
  await owner.getByRole("button", { name: /Samosa Plate/ }).click();
  await owner.getByRole("button", { name: "Send KOT" }).click();
  await expect(owner.getByText(/KOT sent · Token #1/)).toBeVisible();

  // 4. Kitchen (same owner on a second screen) marks it ready
  const kitchen = await owner.context().newPage();
  await kitchen.goto("/kitchen");
  const ticket = kitchen.getByTestId("kot").filter({ hasText: "Samosa Plate" });
  await expect(ticket).toBeVisible();
  await ticket.getByRole("button", { name: "All ready" }).click();
  await expect(kitchen.getByRole("heading", { name: "Ready (1)" })).toBeVisible();

  // 5. Bill with GST and take payment
  await owner.getByRole("button", { name: "Bill / Pay" }).click();
  await owner.getByRole("button", { name: "Make bill" }).click();
  const receipt = owner.getByTestId("receipt");
  await expect(receipt).toContainText("2 x Samosa Plate");
  await expect(receipt).toContainText("CGST 2.5%");
  await expect(receipt).toContainText("₹210.00");            // 200 + 5% GST
  await owner.getByRole("button", { name: "All UPI" }).click();
  await owner.getByRole("button", { name: "Take payment" }).click();
  await expect(owner.getByText("Paid in full")).toBeVisible();

  // 6. The sale shows on the dashboard and in the reports
  await owner.goto("/dashboard");
  await expect(owner.getByText("₹210.00").first()).toBeVisible();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const sales = await (await owner.request.get(`/api/reports/sales?from=${today}&to=${today}`)).json();
  expect(sales.totals.total).toBe(21000);
  const gst = await (await owner.request.get(`/api/reports/gst?from=${today}&to=${today}`)).json();
  expect(gst.rows[0]).toMatchObject({ rate: "5%", taxable: 20000, cgst: 500, sgst: 500 });
  await owner.goto("/reports");
  await owner.getByRole("tab", { name: "Item-wise" }).click();
  await owner.getByRole("tab", { name: "Table" }).click();
  await expect(owner.getByRole("cell", { name: "Samosa Plate" })).toBeVisible();
});
