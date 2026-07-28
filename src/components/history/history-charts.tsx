"use client";

import { cn } from "@/lib/core/utils";

type BarPoint = { label: string; value: number };

export function HistoryBarChart({
  data,
  height = 120,
  className,
  barClassName = "fill-sky-400/80",
  formatValue,
}: {
  data: BarPoint[];
  height?: number;
  className?: string;
  barClassName?: string;
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 4;
  const w = Math.max(data.length * 18, 120);
  const barW = Math.max(6, (w - gap * (data.length + 1)) / Math.max(data.length, 1));

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[120px] items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-white/30",
          className,
        )}
      >
        No data yet
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg width={w} height={height + 28} className="min-w-full">
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * height);
          const x = gap + i * (barW + gap);
          const y = height - h;
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                className={barClassName}
              >
                <title>
                  {d.label}: {formatValue ? formatValue(d.value) : d.value}
                </title>
              </rect>
              {data.length <= 16 || i % Math.ceil(data.length / 8) === 0 ? (
                <text
                  x={x + barW / 2}
                  y={height + 14}
                  textAnchor="middle"
                  className="fill-white/35"
                  style={{ fontSize: 9 }}
                >
                  {d.label.length > 6 ? d.label.slice(2) : d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HistoryDonut({
  data,
  size = 140,
  className,
}: {
  data: BarPoint[];
  size?: number;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = [
    "stroke-sky-400",
    "stroke-emerald-400",
    "stroke-amber-400",
    "stroke-rose-400",
    "stroke-zinc-400",
    "stroke-cyan-400",
    "stroke-orange-400",
    "stroke-teal-400",
  ];
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-xs text-white/30",
          className,
        )}
        style={{ width: size, height: size }}
      >
        —
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={12}
          className="stroke-white/5"
        />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={12}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className={colors[i % colors.length]}
            >
              <title>
                {d.label}: {d.value}
              </title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {data.slice(0, 6).map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-[11px] text-white/55">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-sm",
                [
                  "bg-sky-400",
                  "bg-emerald-400",
                  "bg-amber-400",
                  "bg-rose-400",
                  "bg-zinc-400",
                  "bg-cyan-400",
                ][i % 6],
              )}
            />
            <span className="truncate">{d.label}</span>
            <span className="ml-auto font-mono tabular-nums text-white/35">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
