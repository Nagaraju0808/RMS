/** DineFlow mark: a banana leaf (the South Indian serving leaf) with its midrib, drawn in the accent. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M8 24c0-9 6-15 16-16-1 10-7 16-16 16z" fill="#fff" opacity=".95" />
      <path d="M8.5 23.5 21 11" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 20l-2-3.5M15 17l-1.6-3.6M18 14l-1.2-3.4M14 21.5l3.6 1M17 18.6l3.4.8" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}
