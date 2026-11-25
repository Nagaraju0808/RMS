export const FoodDot = ({ t }: { t: string }) => (
  <span title={t} aria-label={t} className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-2 ${t === "NON_VEG" ? "border-red-600" : t === "EGG" ? "border-yellow-500" : "border-green-600"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${t === "NON_VEG" ? "bg-red-600" : t === "EGG" ? "bg-yellow-500" : "bg-green-600"}`} />
  </span>
);
