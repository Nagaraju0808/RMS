"use client";
import * as React from "react";
import { Button, PageHeader } from "@/components/ui";
import { api } from "@/lib/client";
export default function QrSheet() {
  const [list, setList] = React.useState<any[]>([]);
  const load = () => api("/api/tables/qr").then(setList);
  React.useEffect(() => { load(); }, []);
  return <div>
    <div className="no-print"><PageHeader title="Table QR codes"><Button onClick={() => window.print()}>🖨 Print sheet</Button>
      <Button variant="outline" onClick={() => confirm("Make new QR codes? Old printed codes will stop working.") && api("/api/tables/qr", { method: "POST" }).then(load)}>Regenerate all</Button></PageHeader>
      <p className="mb-3 text-sm muted">Customers scan the code on their table to see the menu and order. Right-click a code to save it as an image.</p></div>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
      {list.map((t) => <div key={t.id} className="card break-inside-avoid p-3 text-center">
        <img src={t.dataUrl} alt={`QR for ${t.name}`} className="mx-auto w-full max-w-[200px]" />
        <div className="text-xl font-bold">Table {t.name}</div><div className="text-xs muted">{t.section} · Scan to order</div>
        <a href={t.url} target="_blank" className="no-print text-xs text-brand-600 underline">open</a>
      </div>)}
    </div>
  </div>;
}
