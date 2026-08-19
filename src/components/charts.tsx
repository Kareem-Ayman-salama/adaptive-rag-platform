import type { ReactNode } from "react";
import type { DistributionItem } from "../types";

/** Lightweight, dependency-free SVG charts for the demo dashboards. */

export function Ring({
  value,
  size = 92,
  stroke = 8,
  color = "var(--acc)",
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, value)) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function Donut({
  items,
  size = 168,
  stroke = 22,
  center,
}: {
  items: DistributionItem[];
  size?: number;
  stroke?: number;
  center?: ReactNode;
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} opacity={0.5} />
        {items.map((it) => {
          const len = (it.value / total) * c;
          const el = (
            <circle
              key={it.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={it.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - 3)} ${c - len + 3}`}
              strokeDashoffset={-offset}
              style={{ transition: "stroke-dasharray 1s ease" }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  );
}

export function HBarRow({
  label,
  value,
  max,
  color,
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="group">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-mut group-hover:text-ink transition-colors">{label}</span>
        <span className="font-mono text-xs text-ink">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-ink/5 overflow-hidden">
        <div
          className="h-full rounded-full growx"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function Spark({
  points,
  color = "var(--acc)",
  height = 36,
}: {
  points: number[];
  color?: string;
  height?: number;
}) {
  const w = 120;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = height - 4 - ((p - min) / range) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M${coords.join(" L")}`;
  const area = `${path} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={w}
        cy={height - 4 - ((points[points.length - 1] - min) / range) * (height - 8)}
        r={2.4}
        fill={color}
      />
    </svg>
  );
}
