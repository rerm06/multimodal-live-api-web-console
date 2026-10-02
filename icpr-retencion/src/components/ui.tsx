import { LEVEL_LABEL } from "../domain/rhi";
import type { Level } from "../domain/types";

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge lv-${level}`}>{LEVEL_LABEL[level]}</span>;
}

export function Score({ value, level, big }: { value: number; level: Level; big?: boolean }) {
  return (
    <span className={`score num ${big ? "big" : ""}`} style={{ color: `var(--${level})` }} title={`RHI ${value}`}>
      {value}
    </span>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card card-pad kpi">
      <div className="label">{label}</div>
      <div className="value num">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function ago(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "ahora";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export const money = (n: number) =>
  n.toLocaleString("es-PR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)} %`;
