import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { ItemInput } from "@/lib/schemas";
import { assertMenuRefs } from "@/lib/menu-server";
import { audit } from "@/lib/audit";

export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("menu.manage"); const { id } = await params;
  const old = await prisma.menuItem.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { variants: true } });
  if (!old) notFound("Menu item");
  const { variants, addonGroupIds, ...d } = await parseBody(req, ItemInput.partial());
  await assertMenuRefs(s.restaurantId, { ...d, addonGroupIds });
  await prisma.$transaction(async (tx) => {
    await tx.menuItem.update({ where: { id }, data: d as any });
    if (variants) {
      const keep = variants.filter((v) => v.id && old.variants.some((o) => o.id === v.id)).map((v) => v.id!);
      await tx.variant.deleteMany({ where: { menuItemId: id, id: { notIn: keep } } });
      for (const [i, { id: vid, ...v }] of variants.entries()) {
        if (vid && keep.includes(vid)) await tx.variant.update({ where: { id: vid }, data: { ...v, sortOrder: i } });
        else await tx.variant.create({ data: { ...v, sortOrder: i, menuItemId: id } });
      }
    }
    if (addonGroupIds) {
      await tx.menuItemAddonGroup.deleteMany({ where: { menuItemId: id } });
      await tx.menuItemAddonGroup.createMany({ data: addonGroupIds.map((groupId) => ({ groupId, menuItemId: id })) });
    }
  });
  const priceFields = ["priceDineIn", "priceTakeaway", "priceOnline"] as const;
  const changed = priceFields.filter((f) => d[f] !== undefined && d[f] !== old[f]);
  if (changed.length) await audit(s, "PRICE_CHANGE", "MenuItem", id, { name: old.name, from: Object.fromEntries(changed.map((f) => [f, old[f]])), to: Object.fromEntries(changed.map((f) => [f, d[f]])) });
  return ok({ ok: true });
});

/** One-tap out-of-stock toggle (chef/cashier allowed). */
export const PATCH = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("menu.stock"); const { id } = await params;
  const { inStock } = await parseBody(req, z.object({ inStock: z.boolean() }));
  const r = await prisma.menuItem.updateMany({ where: { id, restaurantId: s.restaurantId }, data: { inStock } });
  if (!r.count) notFound("Menu item");
  await audit(s, inStock ? "BACK_IN_STOCK" : "OUT_OF_STOCK", "MenuItem", id);
  return ok({ ok: true });
});

export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("menu.manage"); const { id } = await params;
  const item = await prisma.menuItem.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { _count: { select: { orderItems: true } } } });
  if (!item) notFound("Menu item");
  // Items that were ever sold are archived (kept for reports), others deleted.
  if (item._count.orderItems) await prisma.menuItem.update({ where: { id }, data: { active: false } });
  else await prisma.menuItem.delete({ where: { id } });
  await audit(s, "DELETE", "MenuItem", id, { name: item.name });
  return ok({ ok: true });
});
