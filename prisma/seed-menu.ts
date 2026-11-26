import type { PrismaClient, FoodType } from "@prisma/client";

type I = [name: string, ft: FoodType, price: number, opts?: { spice?: number; allergens?: string[]; variants?: [string, number][]; te?: string; hi?: string; addons?: string[]; sched?: string; desc?: string }];
const R = (n: number) => n * 100;

export async function seedMenu(p: PrismaClient, rid: string) {
  const st = Object.fromEntries(await Promise.all(["Main", "Tandoor", "Chinese", "Bar", "Desserts"].map(async (name) => [name, (await p.kitchenStation.create({ data: { restaurantId: rid, name } })).id])));
  const tax = await p.taxRate.findMany({ where: { restaurantId: rid } });
  const gst18 = tax.find((t) => t.ratePercent === 18)!.id;

  const breakfast = await p.menuSchedule.create({ data: { restaurantId: rid, name: "Breakfast", startTime: "07:00", endTime: "11:30" } });
  const happy = await p.menuSchedule.create({ data: { restaurantId: rid, name: "Happy hour", startTime: "17:00", endTime: "19:00", discountPercent: 20 } });
  const sched: Record<string, string> = { breakfast: breakfast.id, happy: happy.id };

  const extras = await p.addonGroup.create({ data: { restaurantId: rid, name: "Extras", maxSelect: 3, addons: { create: [{ name: "Extra cheese", price: R(40) }, { name: "Extra butter", price: R(20) }, { name: "Extra paneer", price: R(60) }] } } });
  const chutney = await p.addonGroup.create({ data: { restaurantId: rid, name: "Chutneys", maxSelect: 2, addons: { create: [{ name: "Coconut chutney", price: 0 }, { name: "Tomato chutney", price: 0 }, { name: "Extra sambar", price: R(25) }] } } });
  const drinkAdd = await p.addonGroup.create({ data: { restaurantId: rid, name: "Drink options", maxSelect: 2, addons: { create: [{ name: "Less sugar", price: 0 }, { name: "Extra ice", price: 0 }, { name: "Ice cream scoop", price: R(50) }] } } });
  const groups: Record<string, string> = { extras: extras.id, chutney: chutney.id, drink: drinkAdd.id };

  const menu: Record<string, { station: string; te: string; hi: string; items: I[] }> = {
    "South Indian": { station: "Main", te: "దక్షిణ భారత", hi: "दक्षिण भारतीय", items: [
      ["Idli (2 pcs)", "VEG", 60, { te: "ఇడ్లీ", hi: "इडली", addons: ["chutney"], sched: "breakfast" }],
      ["Masala Dosa", "VEG", 110, { spice: 1, te: "మసాలా దోశ", hi: "मसाला डोसा", addons: ["chutney", "extras"] }],
      ["Ghee Roast Dosa", "VEG", 140, { allergens: ["dairy"], addons: ["chutney"] }],
      ["Medu Vada", "VEG", 70, { te: "వడ", hi: "वड़ा", addons: ["chutney"], sched: "breakfast" }],
      ["Pesarattu Upma", "VEG", 120, { spice: 1, te: "పెసరట్టు ఉప్మా" }],
      ["Hyderabadi Chicken Biryani", "NON_VEG", 320, { spice: 2, variants: [["Half", 220], ["Full", 320], ["Family pack", 850]], te: "చికెన్ బిర్యానీ", hi: "चिकन बिरयानी" }],
      ["Veg Meals (Thali)", "VEG", 180, { te: "భోజనం", hi: "थाली" }],
      ["Egg Curry", "EGG", 160, { spice: 2 }],
    ] },
    "North Indian": { station: "Tandoor", te: "ఉత్తర భారత", hi: "उत्तर भारतीय", items: [
      ["Paneer Butter Masala", "VEG", 260, { spice: 1, allergens: ["dairy", "nuts"], addons: ["extras"], te: "పనీర్ బటర్ మసాలా", hi: "पनीर बटर मसाला" }],
      ["Paneer Tikka", "VEG", 280, { spice: 2, allergens: ["dairy"], variants: [["Half", 170], ["Full", 280]] }],
      ["Butter Chicken", "NON_VEG", 340, { spice: 1, allergens: ["dairy"], variants: [["Half", 200], ["Full", 340]], hi: "बटर चिकन" }],
      ["Tandoori Chicken", "NON_VEG", 380, { spice: 2, variants: [["Half", 220], ["Full", 380]] }],
      ["Dal Makhani", "VEG", 220, { allergens: ["dairy"] }],
      ["Butter Naan", "VEG", 50, { allergens: ["gluten", "dairy"], hi: "बटर नान" }],
      ["Tandoori Roti", "VEGAN", 30, { allergens: ["gluten"] }],
      ["Chole Bhature", "VEG", 160, { spice: 1, allergens: ["gluten"] }],
    ] },
    "Chinese": { station: "Chinese", te: "చైనీస్", hi: "चाइनीज़", items: [
      ["Veg Manchurian", "VEG", 200, { spice: 2, allergens: ["soy", "gluten"] }],
      ["Chilli Chicken", "NON_VEG", 280, { spice: 3, allergens: ["soy"], variants: [["Dry", 280], ["Gravy", 290]] }],
      ["Veg Fried Rice", "VEG", 180, { allergens: ["soy"] }],
      ["Egg Fried Rice", "EGG", 200, {}],
      ["Hakka Noodles", "VEG", 190, { allergens: ["gluten", "soy"] }],
      ["Chicken 65", "NON_VEG", 260, { spice: 3 }],
    ] },
    "Drinks": { station: "Bar", te: "పానీయాలు", hi: "पेय", items: [
      ["Filter Coffee", "VEG", 40, { allergens: ["dairy"], te: "ఫిల్టర్ కాఫీ", hi: "फ़िल्टर कॉफ़ी", addons: ["drink"] }],
      ["Masala Chai", "VEG", 30, { allergens: ["dairy"], hi: "मसाला चाय", addons: ["drink"] }],
      ["Sweet Lassi", "VEG", 80, { allergens: ["dairy"], addons: ["drink"] }],
      ["Fresh Lime Soda", "VEGAN", 70, { variants: [["Sweet", 70], ["Salt", 70], ["Mixed", 75]], addons: ["drink"] }],
      ["Cold Coffee", "VEG", 130, { allergens: ["dairy"], addons: ["drink"] }],
      ["Mojito (mocktail)", "VEGAN", 150, { sched: "happy" }],
      ["Mango Shake", "VEG", 140, { allergens: ["dairy"], addons: ["drink"] }],
    ] },
    "Desserts": { station: "Desserts", te: "స్వీట్లు", hi: "मिठाई", items: [
      ["Gulab Jamun (2 pcs)", "VEG", 80, { allergens: ["dairy", "gluten"], hi: "गुलाब जामुन" }],
      ["Double Ka Meetha", "VEG", 120, { allergens: ["dairy", "gluten", "nuts"] }],
      ["Qubani Ka Meetha", "VEG", 150, { allergens: ["dairy", "nuts"] }],
      ["Ice Cream Sundae", "EGG", 160, { allergens: ["dairy"] }],
    ] },
  };
  let ci = 0;
  for (const [cname, c] of Object.entries(menu)) {
    const cat = await p.category.create({ data: { restaurantId: rid, name: cname, sortOrder: ci++, stationId: st[c.station], nameI18n: { te: c.te, hi: c.hi } } });
    for (const [ii, [name, ft, price, o = {}]] of c.items.entries()) {
      await p.menuItem.create({ data: {
        restaurantId: rid, categoryId: cat.id, name, foodType: ft, priceDineIn: R(price), priceTakeaway: R(price), priceOnline: Math.round(R(price) * 1.1),
        spiceLevel: o.spice ?? 0, allergens: o.allergens ?? [], sortOrder: ii, nameI18n: { ...(o.te ? { te: o.te } : {}), ...(o.hi ? { hi: o.hi } : {}) },
        taxRateId: cname === "Drinks" && name.includes("Mojito") ? gst18 : null, scheduleIds: o.sched ? [sched[o.sched]] : [],
        costPrice: Math.round(R(price) * 0.32),
        variants: { create: (o.variants ?? []).map(([vn, vp], i) => ({ name: vn, priceDineIn: R(vp), priceTakeaway: R(vp), priceOnline: Math.round(R(vp) * 1.1), sortOrder: i })) },
        addonGroups: { create: (o.addons ?? []).map((g) => ({ groupId: groups[g] })) },
      } });
    }
  }
  const find = (n: string) => p.menuItem.findFirstOrThrow({ where: { restaurantId: rid, name: n } });
  await p.combo.create({ data: { restaurantId: rid, name: "South Breakfast Combo", price: R(150), items: { create: [{ menuItemId: (await find("Idli (2 pcs)")).id, quantity: 1 }, { menuItemId: (await find("Medu Vada")).id, quantity: 1 }, { menuItemId: (await find("Filter Coffee")).id, quantity: 1 }] } } });
  await p.combo.create({ data: { restaurantId: rid, name: "Paneer Meal", price: R(330), items: { create: [{ menuItemId: (await find("Paneer Butter Masala")).id, quantity: 1 }, { menuItemId: (await find("Butter Naan")).id, quantity: 2 }] } } });
}
