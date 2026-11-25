// Demo data: "Spice Garden" restaurant (slug "demo") with two branches and one user per role.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultFeatures } from "../src/lib/features";
import { seedMenu } from "./seed-menu";
import { seedOperations } from "./seed-ops";

const prisma = new PrismaClient();

async function main() {
  await prisma.restaurant.deleteMany({ where: { slug: { in: ["demo", "other"] } } });
  const r = await prisma.restaurant.create({
    data: { name: "Spice Garden", slug: "demo", type: "FINE_DINING", gstin: "36AABCS1234F1Z5", languages: ["en", "te", "hi"], onboarded: true },
  });
  const settings = { serviceChargePercent: 5, packingChargePerItem: 1000, kdsWarnMins: 10, kdsLateMins: 20, qrAutoAccept: false, roundOff: true, interState: false, avgTableMins: 45 };
  const main = await prisma.branch.create({ data: { restaurantId: r.id, name: "Banjara Hills", address: "Road No. 12, Hyderabad", phone: "+91 90000 00001", features: defaultFeatures("FINE_DINING"), settings } });
  const second = await prisma.branch.create({ data: { restaurantId: r.id, name: "Gachibowli", address: "DLF Road, Hyderabad", features: defaultFeatures("FINE_DINING"), settings } });

  const pw = await bcrypt.hash("password123", 10);
  const users = [
    { name: "Ravi Owner", email: "owner@demo.com", role: "OWNER", pin: "1111", branchId: null },
    { name: "Meena Manager", email: "manager@demo.com", role: "MANAGER", pin: "2222", branchId: main.id },
    { name: "Kiran Cashier", email: "cashier@demo.com", role: "CASHIER", pin: "3333", branchId: main.id },
    { name: "Arjun Waiter", email: "waiter@demo.com", role: "WAITER", pin: "4444", branchId: main.id },
    { name: "Lakshmi Chef", email: "chef@demo.com", role: "CHEF", pin: "5555", branchId: main.id },
    { name: "Suresh Rider", email: "rider@demo.com", role: "DELIVERY", pin: "6666", branchId: main.id },
  ] as const;
  for (const u of users) {
    await prisma.user.create({
      data: { restaurantId: r.id, branchId: u.branchId, name: u.name, email: u.email, role: u.role, passwordHash: pw, pinHash: await bcrypt.hash(u.pin, 10), hourlyRate: 15000, monthlySalary: 2500000 },
    });
  }
  await prisma.taxRate.createMany({ data: [
    { restaurantId: r.id, name: "GST 5% (restaurant)", ratePercent: 5, hsnSac: "996331", isDefault: true },
    { restaurantId: r.id, name: "GST 18% (bar/AC)", ratePercent: 18, hsnSac: "996332" },
    { restaurantId: r.id, name: "No tax", ratePercent: 0 },
  ] });

  // A second tenant to prove data isolation.
  const other = await prisma.restaurant.create({ data: { name: "Other Cafe", slug: "other", type: "CAFE", onboarded: true } });
  const ob = await prisma.branch.create({ data: { restaurantId: other.id, name: "Main", features: defaultFeatures("CAFE") } });
  await prisma.user.create({ data: { restaurantId: other.id, branchId: ob.id, name: "Other Owner", email: "owner@other.com", role: "OWNER", passwordHash: pw, pinHash: await bcrypt.hash("9999", 10) } });

  await seedMenu(prisma, r.id);
  await seedOperations(prisma, r.id, main.id, second.id);
  console.log("Seeded demo restaurant 'demo'. Login: owner@demo.com / password123");
}
main().finally(() => prisma.$disconnect());
