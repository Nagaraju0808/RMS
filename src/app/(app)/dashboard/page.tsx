"use client";
import { useApp } from "@/components/app/AppContext";
import { Card, PageHeader } from "@/components/ui";
import Link from "next/link";

export default function Dashboard() {
  const { me } = useApp();
  if (!me) return <p className="muted">Loading…</p>;
  if (!me.restaurant.onboarded && me.user.role === "OWNER") { if (typeof window !== "undefined") location.href = "/onboarding"; return null; }
  return (
    <div>
      <PageHeader title={`Welcome, ${me.user.name}`} />
      <p className="mb-4 muted">Branch: {me.branch?.name || "–"} · Type: {me.restaurant.type}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {me.nav.filter((n) => n.href !== "/dashboard").map((n) => (
          <Link key={n.href} href={n.href}><Card className="hover:border-brand-500">{n.label}</Card></Link>
        ))}
      </div>
    </div>
  );
}
