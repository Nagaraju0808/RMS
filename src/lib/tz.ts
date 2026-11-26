// Restaurant local time for display in the browser (staff devices may be set to another zone).
export const APP_TZ = "Asia/Kolkata";
export function localParts(iso: string | Date) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const h = Number(p.find((x) => x.type === "hour")!.value) % 24, m = Number(p.find((x) => x.type === "minute")!.value);
  return { h, m, hhmm: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, mins: h * 60 + m };
}
