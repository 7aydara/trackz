export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Petite courbe d'evolution en SVG pur (pas de librairie) : suffisant pour
 * lire une tendance de progression sur quelques dizaines de points.
 */
export function LineChart({
  points,
  unit = "",
  height = 140,
}: {
  points: ChartPoint[];
  unit?: string;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-semibold text-muted">
        Pas encore assez de donnees pour tracer une courbe.
      </p>
    );
  }

  const width = 320;
  const pad = 8;
  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const x = (i: number) =>
    points.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (points.length - 1);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${x(points.length - 1)},${height - pad}`;
  const last = points[points.length - 1];
  const first = points[0];
  const delta = last.value - first.value;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Evolution de ${first.value} a ${last.value} ${unit}`}
      >
        <polygon points={area} fill="var(--accent)" opacity="0.12" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={`${p.label}-${i}`}
            cx={x(i)}
            cy={y(p.value)}
            r={i === points.length - 1 ? 5 : 3}
            fill="var(--accent)"
          >
            <title>{`${p.label} — ${p.value} ${unit}`}</title>
          </circle>
        ))}
      </svg>

      <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-muted">
        <span>
          {first.label} · {first.value} {unit}
        </span>
        <span className={delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} {unit}
        </span>
        <span>
          {last.label} · {last.value} {unit}
        </span>
      </div>
    </div>
  );
}
