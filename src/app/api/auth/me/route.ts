import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";
import { navForRole } from "@/lib/roles";
import { resolveFeatures, resolveSettings } from "@/lib/features";

export const GET = handler(async () => {
  const s = await requireSession();
  const restaurant = await prisma.restaurant.findUnique({ where: { id: s.restaurantId }, include: { branches: { select: { id: true, name: true } } } });
  const branch = s.branchId ? await prisma.branch.findFirst({ where: { id: s.branchId, restaurantId: s.restaurantId } }) : null;
  const features = resolveFeatures(branch?.features, restaurant!.type as any);
  return ok({
    user: { id: s.sub, name: s.name, role: s.role },
    restaurant: { id: restaurant!.id, name: restaurant!.name, slug: restaurant!.slug, type: restaurant!.type, currency: restaurant!.currency, onboarded: restaurant!.onboarded, logoUrl: restaurant!.logoUrl, languages: restaurant!.languages },
    branches: restaurant!.branches,
    branch: branch ? { id: branch.id, name: branch.name, settings: resolveSettings(branch.settings) } : null,
    features,
    nav: navForRole(s.role, features as any, s.perms),
  });
});
