import { NextRequest } from "next/server";
import { handler, notFound, ok, requireSession } from "@/lib/api";
import { REPORTS } from "@/lib/reports";
import { reportScope } from "@/lib/report-scope";
import { toPdf, toXlsx } from "@/lib/report-export";

/** GET /api/reports/<name>?from=YYYY-MM-DD&to=YYYY-MM-DD&branch=all|<id>&format=json|xlsx|pdf */
export const GET = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("reports.view"); const { name } = await params;
  const rep = REPORTS[name]; if (!rep) notFound("Report");
  const sc = await reportScope(s, req.nextUrl.searchParams);
  const r = await rep.run(sc);
  const subtitle = `${sc.branchLabel} · ${sc.from.toLocaleDateString("en-IN")} – ${new Date(sc.to.getTime() - 1).toLocaleDateString("en-IN")}`;
  const fmt = req.nextUrl.searchParams.get("format");
  if (fmt === "xlsx") return new Response(await toXlsx(r, subtitle), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename=${name}-report.xlsx` } });
  if (fmt === "pdf") return new Response(new Uint8Array(await toPdf(r, subtitle)), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename=${name}-report.pdf` } });
  return ok({ ...r, subtitle });
});
