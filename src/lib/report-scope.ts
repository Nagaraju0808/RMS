import { prisma } from "./db";
import { ApiError } from "./api";
import { Session } from "./session";
import { parseRange } from "./report-utils";
/** Owners can pick any branch or "all"; managers only their own branch. */
export async function reportScope(s: Session, sp: URLSearchParams) {
  let range;
  try { range = parseRange(sp.get("from"), sp.get("to")); } catch (e: any) { throw new ApiError(400, e.message); }
  const all = await prisma.branch.findMany({ where: { restaurantId: s.restaurantId }, select: { id: true, name: true } });
  const want = sp.get("branch") || (s.role === "OWNER" ? "all" : s.branchId);
  let branchIds: string[];
  if (want === "all") { if (s.role !== "OWNER") throw new ApiError(403, "Only the owner can see all branches."); branchIds = all.map((b) => b.id); }
  else { if (!all.some((b) => b.id === want)) throw new ApiError(404, "Branch not found."); if (s.role !== "OWNER" && want !== s.branchId) throw new ApiError(403, "You can only see your own branch."); branchIds = [want!]; }
  if (!branchIds.length) throw new ApiError(404, "No branches found. Please log in again.");
  return { restaurantId: s.restaurantId, branchIds, ...range, branchLabel: want === "all" ? "All branches" : all.find((b) => b.id === want)!.name };
}
