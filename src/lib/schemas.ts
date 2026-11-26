import { z } from "zod";
export const paise = z.number().int().nonnegative();
export const FoodType = z.enum(["VEG", "NON_VEG", "EGG", "VEGAN"]);
export const CategoryInput = z.object({ name: z.string().min(1).max(80), nameI18n: z.record(z.string()).optional(), sortOrder: z.number().int().optional(), active: z.boolean().optional(), stationId: z.string().nullable().optional() });
export const VariantInput = z.object({ id: z.string().optional(), name: z.string().min(1), priceDineIn: paise, priceTakeaway: paise.nullable().optional(), priceOnline: paise.nullable().optional() });
export const ItemInput = z.object({
  categoryId: z.string(), name: z.string().min(1).max(120), nameI18n: z.record(z.string()).optional(), description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(), foodType: FoodType.default("VEG"), spiceLevel: z.number().int().min(0).max(3).default(0),
  allergens: z.array(z.string()).default([]), priceDineIn: paise, priceTakeaway: paise.nullable().optional(), priceOnline: paise.nullable().optional(),
  costPrice: paise.optional(), taxRateId: z.string().nullable().optional(), stationId: z.string().nullable().optional(), inStock: z.boolean().optional(),
  active: z.boolean().optional(), scheduleIds: z.array(z.string()).default([]), variants: z.array(VariantInput).default([]), addonGroupIds: z.array(z.string()).default([]),
});
export const AddonGroupInput = z.object({ name: z.string().min(1), minSelect: z.number().int().min(0).default(0), maxSelect: z.number().int().min(1).default(5), addons: z.array(z.object({ name: z.string().min(1), price: paise, foodType: FoodType.default("VEG") })).default([]) });
export const ComboInput = z.object({ name: z.string().min(1), price: paise, active: z.boolean().default(true), items: z.array(z.object({ menuItemId: z.string(), quantity: z.number().int().min(1) })).min(1) });
export const ScheduleInput = z.object({ name: z.string().min(1), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), days: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]), discountPercent: z.number().min(0).max(100).default(0) });
