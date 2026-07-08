// "2h ago" / "3d ago" / "8mo ago" / "1.5y ago" from an ISO date, computed at
// render so stored strings never go stale.
export function relativeAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, (now - t) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = s / 86400;
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30.44)}mo ago`;
  const y = d / 365.25;
  return `${y >= 10 ? Math.round(y) : parseFloat(y.toFixed(1))}y ago`;
}
