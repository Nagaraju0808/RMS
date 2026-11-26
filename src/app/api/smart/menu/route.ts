import { NextRequest } from "next/server";
import { handler, ok, requireSession } from "@/lib/api";
import { reportScope } from "@/lib/report-scope";
import { REPORTS } from "@/lib/reports";
import { MENU_ADVICE } from "@/lib/smart";
import { getAI } from "@/lib/services/ai";
/** Menu engineering: Star / Plowhorse / Puzzle / Dog with advice. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("ai.use");
  const sc = await reportScope(s, req.nextUrl.searchParams);
  const r = await REPORTS.profit.run(sc);
  const groups = Object.fromEntries((Object.keys(MENU_ADVICE) as (keyof typeof MENU_ADVICE)[]).map((k) => [k, { advice: MENU_ADVICE[k], items: r.rows.filter((x) => x.class === k).map((x) => ({ name: x.name, qty: x.qty, profit: x.profit, foodCost: x.foodCost })) }]));
  const ai = await getAI().explain("Give a restaurant owner 3 practical menu suggestions from this menu-engineering result (Stars, Plowhorses, Puzzles, Dogs).", Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.items.slice(0, 6).map((i) => i.name)])));
  return ok({ groups, explanation: ai, aiUsed: !!ai });
});
