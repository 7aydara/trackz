import { addDays, dateRange, formatShort, fromISODate, todayISO } from "@/lib/dates";

/**
 * Calendrier d'intensite facon "contributions GitHub".
 * `values` : date ISO → ratio de completion (0 → 1).
 */
export function Heatmap({
  values,
  weeks = 20,
  endDate = todayISO(),
}: {
  values: Record<string, number>;
  weeks?: number;
  endDate?: string;
}) {
  // On termine sur le dimanche de la semaine courante pour des colonnes pleines.
  const endDow = (fromISODate(endDate).getDay() + 6) % 7;
  const lastCell = addDays(endDate, 6 - endDow);
  const firstCell = addDays(lastCell, -(weeks * 7 - 1));
  const days = dateRange(firstCell, lastCell);

  const columns: string[][] = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));

  const today = todayISO();
  const monthLabels = columns.map((col, i) => {
    const month = fromISODate(col[0]).toLocaleDateString("fr-FR", { month: "short" });
    const prev = i > 0 ? fromISODate(columns[i - 1][0]).getMonth() : -1;
    return fromISODate(col[0]).getMonth() !== prev ? month : "";
  });

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-block min-w-full">
        <div className="flex gap-[3px] pl-7 text-[10px] font-bold text-muted">
          {monthLabels.map((label, i) => (
            <div key={i} className="w-[13px] shrink-0 overflow-visible whitespace-nowrap">
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1 flex gap-[3px]">
          <div className="flex w-6 shrink-0 flex-col gap-[3px] text-[10px] font-bold text-muted">
            {["L", "", "M", "", "V", "", "D"].map((d, i) => (
              <div key={i} className="h-[13px] leading-[13px]">
                {d}
              </div>
            ))}
          </div>

          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((iso) => {
                const ratio = values[iso] ?? 0;
                const future = iso > today;
                const pct = ratio <= 0 ? 0 : Math.round(18 + ratio * 82);
                return (
                  <div
                    key={iso}
                    title={`${formatShort(iso)} — ${Math.round(ratio * 100)}%`}
                    className={`size-[13px] rounded-[3px] ${
                      future ? "opacity-30" : ""
                    } ${iso === today ? "ring-2 ring-accent ring-offset-1" : ""}`}
                    style={{
                      background:
                        pct === 0
                          ? "var(--color-hair)"
                          : `color-mix(in srgb, var(--accent) ${pct}%, white)`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-1.5 pl-7 text-[10px] font-bold text-muted">
          <span>moins</span>
          {[0, 25, 50, 75, 100].map((p) => (
            <span
              key={p}
              className="size-[11px] rounded-[3px]"
              style={{
                background:
                  p === 0
                    ? "var(--color-hair)"
                    : `color-mix(in srgb, var(--accent) ${p}%, white)`,
              }}
            />
          ))}
          <span>plus</span>
        </div>
      </div>
    </div>
  );
}
