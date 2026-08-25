const W = 120;
const H = 40;

function scale(data: number[]) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  return { max, min, range };
}

export function BarSparkline({ data, color = "var(--color-primary)" }: { data: number[]; color?: string }) {
  const { min, range } = scale(data);
  const barWidth = W / data.length - 4;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {data.map((v, i) => {
        const barHeight = Math.max(((v - min) / range) * (H - 4), 2);
        const x = i * (W / data.length) + 2;
        const y = H - barHeight;
        const isLast = i === data.length - 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={2}
            fill={isLast ? color : "#e2e8f0"}
          />
        );
      })}
    </svg>
  );
}

export function LineSparkline({ data, color = "var(--color-primary)" }: { data: number[]; color?: string }) {
  const { min, range } = scale(data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${W},${H} L0,${H} Z`;
  const gradientId = `spark-fill-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  href?: string;
}

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 176,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const gap = segments.length > 1 ? 18 : 0;
  const totalGap = gap * segments.length;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef0f6" strokeWidth={14} />
        {segments.map((s, i) => {
          const fraction = s.value / total;
          const dash = Math.max(fraction * (circumference - totalGap), 0);
          const circle = (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className={s.href ? "cursor-pointer transition-opacity duration-150 hover:opacity-70" : undefined}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += dash + gap;
          return s.href ? (
            <a key={i} href={s.href}>
              {circle}
            </a>
          ) : (
            <g key={i}>{circle}</g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-semibold text-slate-900">{centerValue}</p>
        <p className="text-xs text-slate-400">{centerLabel}</p>
      </div>
    </div>
  );
}
