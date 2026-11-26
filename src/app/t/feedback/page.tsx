"use client";
import * as React from "react";
import { Star } from "lucide-react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Textarea } from "@/components/ui";
import { api } from "@/lib/client";

function Stars({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return <div className="mb-3"><div className="mb-1 text-sm">{label}</div><div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} aria-label={`${label} ${n}`} onClick={() => onChange(n)} className={`text-3xl ${n <= value ? "text-yellow-500" : "text-slate-300"}`}><Star size={30} fill={n <= value ? "currentColor" : "none"} /></button>)}</div></div>;
}
function Feedback() {
  const orderId = useSearchParams().get("order") || "";
  const [f, setF] = React.useState({ rating: 0, foodRating: 0, serviceRating: 0, comment: "" });
  const [done, setDone] = React.useState(""); const [err, setErr] = React.useState("");
  const submit = () => api("/api/public/feedback", { body: { orderId, rating: f.rating, foodRating: f.foodRating || undefined, serviceRating: f.serviceRating || undefined, comment: f.comment || undefined } }).then(() => setDone("Thank you for your feedback.")).catch((e) => setErr(e.message));
  if (done) return <p className="p-8 text-center text-xl">{done}</p>;
  return <div className="mx-auto max-w-md p-4"><Card>
    <h1 className="mb-3 text-xl font-bold">How was your meal?</h1>
    <Stars label="Overall" value={f.rating} onChange={(rating) => setF({ ...f, rating })} />
    <Stars label="Food" value={f.foodRating} onChange={(foodRating) => setF({ ...f, foodRating })} />
    <Stars label="Service" value={f.serviceRating} onChange={(serviceRating) => setF({ ...f, serviceRating })} />
    <Textarea rows={3} placeholder="Tell us more (optional)" value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} />
    <Button className="mt-3 w-full" disabled={!f.rating} onClick={submit}>Send</Button>
    {err && <p className="mt-2 text-red-600">{err}</p>}
  </Card></div>;
}
export default function FeedbackPage() { return <Suspense><Feedback /></Suspense>; }
