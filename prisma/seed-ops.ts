import type { PrismaClient } from "@prisma/client";

/** Floor plans, coupons and (later phases) operational demo data. */
export async function seedOperations(p: PrismaClient, rid: string, b1: string, b2: string) {
  for (const [bid, layout] of [[b1, { AC: 6, Outdoor: 4, Rooftop: 4 }], [b2, { "Main hall": 6 }]] as const) {
    let n = 1;
    for (const [si, [sname, count]] of Object.entries(layout).entries()) {
      const sec = await p.section.create({ data: { branchId: bid, name: sname, sortOrder: si } });
      for (let i = 0; i < count; i++) {
        await p.diningTable.create({ data: { branchId: bid, sectionId: sec.id, name: `T${n++}`, seats: i % 3 === 0 ? 6 : i % 2 ? 2 : 4, posX: 30 + (i % 4) * 200, posY: 30 + si * 300 + Math.floor(i / 4) * 140, shape: i % 3 === 0 ? "rect" : i % 2 ? "round" : "square" } });
      }
    }
  }
  await p.coupon.createMany({ data: [
    { restaurantId: rid, code: "WELCOME10", type: "PERCENT", value: 10, minOrder: 30000, maxDiscount: 15000 },
    { restaurantId: rid, code: "FLAT100", type: "FLAT", value: 10000, minOrder: 80000 },
  ] });
  await p.deliveryZone.createMany({ data: [
    { branchId: b1, name: "Nearby (0–3 km)", pincodes: ["500034", "500033", "500096"], charge: 2000, minOrder: 15000, etaMins: 30 },
    { branchId: b1, name: "City (3–8 km)", pincodes: ["500081", "500032", "500082", "500016"], charge: 4500, minOrder: 30000, etaMins: 50 },
  ] });
  const { seedLater } = await import("./seed-later");
  await seedLater(p, rid, b1, b2);
}
