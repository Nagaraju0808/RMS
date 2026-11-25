import type { PrismaClient, Unit } from "@prisma/client";
// Demo data for later phases: inventory (7), staff (8), customers (9), sales history (10).
export async function seedLater(p: PrismaClient, rid: string, b1: string, b2: string) {
  await seedInventory(p, rid, b1, b2);
  const mod = await import("./seed-history").catch(() => null);
  if (mod) await mod.seedHistory(p, rid, b1, b2);
}

async function seedInventory(p: PrismaClient, rid: string, b1: string, b2: string) {
  // [name, base unit, cost ₹ per kg/L/pc, reorder level (base), stock b1 (base)]
  const list: [string, Unit, number, number, number][] = [
    ["Basmati rice", "G", 110, 5000, 25000], ["Chicken", "G", 240, 4000, 12000], ["Paneer", "G", 380, 2000, 6000], ["Cooking oil", "ML", 150, 3000, 15000],
    ["Butter", "G", 520, 1000, 3000], ["Onion", "G", 35, 5000, 20000], ["Tomato", "G", 30, 4000, 15000], ["Wheat flour (maida)", "G", 45, 5000, 20000],
    ["Dosa batter", "G", 60, 3000, 10000], ["Milk", "ML", 60, 5000, 20000], ["Eggs", "PCS", 7, 30, 120], ["Coffee powder", "G", 600, 300, 1500],
    ["Sugar", "G", 45, 2000, 8000], ["Urad dal", "G", 140, 1000, 1200], ["Noodles", "G", 150, 1000, 4000], ["Spice mix", "G", 400, 500, 2500],
  ];
  const ing: Record<string, string> = {};
  for (const [name, unit, cost, reorder, qty] of list) {
    const i = await p.ingredient.create({ data: { restaurantId: rid, name, unit, costPerUnit: cost * 100, reorderLevel: reorder } });
    ing[name] = i.id;
    for (const [b, q] of [[b1, qty], [b2, Math.round(qty * 0.6)]] as const) {
      const lvl = await p.stockLevel.create({ data: { branchId: b, ingredientId: i.id, quantity: q } });
      await p.stockMove.create({ data: { stockLevelId: lvl.id, type: "PURCHASE", quantity: q, reason: "Opening stock" } });
      await p.stockBatch.create({ data: { stockLevelId: lvl.id, quantity: q, expiryDate: ["Milk", "Paneer", "Chicken", "Dosa batter"].includes(name) ? new Date(Date.now() + 2 * 86400_000) : null } });
    }
  }
  const item = (n: string) => p.menuItem.findFirstOrThrow({ where: { restaurantId: rid, name: n }, include: { variants: true } });
  const recipe = async (n: string, lines: [string, number, Unit, string?][]) => {
    const it = await item(n);
    await p.recipeLine.createMany({ data: lines.map(([ig, q, u, v]) => ({ menuItemId: it.id, ingredientId: ing[ig], quantity: q, unit: u, variantId: v ? it.variants.find((x) => x.name === v)?.id ?? null : null })) });
  };
  await recipe("Hyderabadi Chicken Biryani", [["Basmati rice", 150, "G", "Half"], ["Chicken", 150, "G", "Half"], ["Basmati rice", 250, "G", "Full"], ["Chicken", 250, "G", "Full"], ["Basmati rice", 900, "G", "Family pack"], ["Chicken", 900, "G", "Family pack"], ["Cooking oil", 20, "ML"], ["Onion", 60, "G"], ["Spice mix", 15, "G"]]);
  await recipe("Paneer Butter Masala", [["Paneer", 180, "G"], ["Butter", 30, "G"], ["Tomato", 150, "G"], ["Onion", 60, "G"], ["Spice mix", 10, "G"]]);
  await recipe("Masala Dosa", [["Dosa batter", 200, "G"], ["Cooking oil", 15, "ML"], ["Onion", 50, "G"]]);
  await recipe("Butter Naan", [["Wheat flour (maida)", 90, "G"], ["Butter", 10, "G"]]);
  await recipe("Filter Coffee", [["Milk", 120, "ML"], ["Coffee powder", 8, "G"], ["Sugar", 10, "G"]]);
  await recipe("Egg Fried Rice", [["Basmati rice", 180, "G"], ["Eggs", 2, "PCS"], ["Cooking oil", 20, "ML"]]);
  await recipe("Medu Vada", [["Urad dal", 80, "G"], ["Cooking oil", 30, "ML"]]);
  await recipe("Hakka Noodles", [["Noodles", 150, "G"], ["Cooking oil", 20, "ML"], ["Onion", 40, "G"]]);
  await recipe("Butter Chicken", [["Chicken", 150, "G", "Half"], ["Chicken", 250, "G", "Full"], ["Butter", 30, "G"], ["Tomato", 120, "G"]]);

  const s1 = await p.supplier.create({ data: { restaurantId: rid, name: "Sri Venkateswara Traders", phone: "9849000001", gstin: "36AAAAA0000A1Z5" } });
  await p.supplier.create({ data: { restaurantId: rid, name: "Fresh Farm Poultry", phone: "9849000002" } });
  await p.supplier.create({ data: { restaurantId: rid, name: "Heritage Dairy", phone: "9849000003" } });
  await p.purchaseOrder.create({ data: { branchId: b1, supplierId: s1.id, status: "RECEIVED", total: 550000, paid: 300000, dueDate: new Date(Date.now() + 5 * 86400_000), lines: { create: [{ ingredientId: ing["Basmati rice"], quantity: 50000, received: 50000, unitCost: 11000 }] } } });
}
