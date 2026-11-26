import { NextRequest } from "next/server";
import { handler, ok, requireSession } from "@/lib/api";
import { reportScope } from "@/lib/report-scope";
import { forecastAll } from "@/lib/smart-server";
import { getAI } from "@/lib/services/ai";
/** Next 7 days per item (same-weekday average + trend). AI only writes the plain-words explanation. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("ai.use");
  const sc = await reportScope(s, req.nextUrl.searchParams);
  const items = await forecastAll(sc.branchIds, 7);
  const days = items[0]?.days.map((d, i) => ({ date: d.date, qty: Math.round(items.reduce((a, it) => a + it.days[i].qty, 0)) })) ?? [];
  const busiest = [...days].sort((a, b) => b.qty - a.qty)[0];
  const rising = items.filter((i) => i.trend >= 15).slice(0, 3).map((i) => i.name), falling = items.filter((i) => i.trend <= -15).slice(0, 3).map((i) => i.name);
  const basic = days.length ? `Expect about ${days.reduce((a, d) => a + d.qty, 0)} dishes in the next 7 days. Busiest day: ${new Date(busiest.date + "T00:00").toLocaleDateString("en-IN", { weekday: "long" })} (~${busiest.qty} dishes).${rising.length ? ` Selling more lately: ${rising.join(", ")}.` : ""}${falling.length ? ` Selling less: ${falling.join(", ")}.` : ""}` : "Not enough sales history yet – forecasts start after about two weeks of sales.";
  const ai = await getAI().explain("Explain this 7-day dish sales forecast for a restaurant owner: which days will be busy and which dishes are rising or falling.", { days, top: items.slice(0, 10).map((i) => ({ name: i.name, next7Days: i.total, trendPercent: i.trend })) });
  return ok({ days, items: items.slice(0, 40), explanation: ai ?? basic, aiUsed: !!ai });
});
