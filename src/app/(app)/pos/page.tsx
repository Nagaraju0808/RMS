"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OrderBuilder } from "@/components/pos/OrderBuilder";
function Pos() {
  const sp = useSearchParams();
  return <OrderBuilder key={(sp.get("order") || "") + (sp.get("table") || "")} mode="pos" initialOrderId={sp.get("order") || undefined} initialTableId={sp.get("table") || undefined} />;
}
export default function PosPage() { return <Suspense><Pos /></Suspense>; }
