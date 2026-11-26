import { prisma } from "@/lib/db";
/** Health check for Docker / load balancers: app is up and the database answers. */
export async function GET() {
  try { await prisma.$queryRaw`SELECT 1`; return Response.json({ ok: true, time: new Date().toISOString() }); }
  catch { return Response.json({ ok: false, error: "Database not reachable." }, { status: 503 }); }
}
