import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";
import { summarizeReviewsBasic } from "@/lib/smart";
import { getAI } from "@/lib/services/ai";
/** Key points from the last 30 days of reviews. */
export const GET = handler(async () => {
  const s = await requireSession("ai.use");
  const branchIds = (await prisma.branch.findMany({ where: { restaurantId: s.restaurantId }, select: { id: true } })).map((b) => b.id);
  const fb = await prisma.feedback.findMany({ where: { branchId: { in: branchIds }, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } }, select: { rating: true, comment: true } });
  const basic = summarizeReviewsBasic(fb);
  const ai = await getAI().summarizeReviews(fb.filter((f) => f.comment).map((f) => `${f.rating}★ ${f.comment}`));
  return ok({ ...basic, aiPoints: ai, aiUsed: !!ai });
});
