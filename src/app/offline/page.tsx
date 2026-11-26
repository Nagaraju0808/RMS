import { Mark } from "@/components/app/Mark";
export default function Offline() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mb-4 flex justify-center"><Mark size={40} /></div>
        <h1 className="mb-2 text-[22px] font-semibold">No internet connection</h1>
        <p className="text-[var(--muted)]">This page has not been opened on this device before. Pages you have already used – POS, kitchen and tables – keep working offline, and orders are sent when the connection returns.</p>
        <a href="/pos" className="mt-5 inline-flex h-9 items-center rounded-md bg-[var(--ink-fill)] px-4 text-[var(--on-ink)]">Open POS</a>
      </div>
    </main>
  );
}
