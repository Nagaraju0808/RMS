import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok } from "@/lib/api";
import { ingestAggregatorOrder } from "@/lib/online-service";
/** Webhook for aggregator platforms: POST /api/public/aggregator/SWIGGY?branch=<branchId>, header x-aggregator-secret. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const secret = process.env.AGGREGATOR_SECRET || "dev-aggregator-secret";
  const given = req.headers.get("x-aggregator-secret") || "";
  if (given.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))) throw new ApiError(401, "Bad secret.");
  const branch = await prisma.branch.findUnique({ where: { id: req.nextUrl.searchParams.get("branch") || "" } });
  if (!branch) throw new ApiError(404, "Branch not found.");
  return ok(await ingestAggregatorOrder((await params).platform, branch.restaurantId, branch.id, await req.json()), 201);
});
