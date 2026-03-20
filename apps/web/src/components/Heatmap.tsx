import { useMemo } from "react";

import { levelClassName } from "../lib/contributions.js";
import type { ContributionDay } from "../types.js";

interface HeatmapCell extends ContributionDay {
  isPadding: boolean;
}

interface HeatmapProps {
  contributionData: ContributionDay[];
  activeDate: string | null;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildColumns(contributionData: ContributionDay[], totalColumns = 53) {
  if (contributionData.length === 0) {
    return [] as Array<Array<HeatmapCell | null>>;
  }

  const sortedDays = [...contributionData].sort((left, right) => left.date.localeCompare(right.date));
  const lastDay = new Date(`${sortedDays.at(-1)!.date}T00:00:00Z`);
  const start = new Date(lastDay);
  start.setUTCDate(lastDay.getUTCDate() - ((totalColumns * 7) - 1));

  const dayLookup = new Map(sortedDays.map((day) => [day.date, day]));

  return Array.from({ length: totalColumns }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + (weekIndex * 7) + weekday);
      const isoDate = date.toISOString().slice(0, 10);
      const contributionDay = dayLookup.get(isoDate);

      return {
        date: isoDate,
        contributionCount: contributionDay?.contributionCount ?? 0,
        color: contributionDay?.color ?? "#161b22",
        level: contributionDay?.level ?? "NONE",
        weekday,
        isPadding: !contributionDay
      } satisfies HeatmapCell;
    })
  );
}

function buildMonthLabels(columns: Array<Array<HeatmapCell | null>>) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const seenMonths = new Set<string>();

  return columns.map((column, weekIndex) => {
    const firstRealDay = column.find((cell) => cell && !cell.isPadding);
    if (!firstRealDay) {
      return { label: "", weekIndex };
    }

    const date = new Date(`${firstRealDay.date}T00:00:00Z`);
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;

    if (date.getUTCDate() <= 7 && !seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      return { label: formatter.format(date), weekIndex };
    }

    return { label: "", weekIndex };
  });
}

export function Heatmap({ contributionData, activeDate }: HeatmapProps) {
  const columns = useMemo(() => buildColumns(contributionData), [contributionData]);
  const monthLabels = useMemo(() => buildMonthLabels(columns), [columns]);

  if (columns.length === 0) {
    return null;
  }

  return (
    <div className="heatmap-shell">
      <div className="month-row" aria-hidden="true">
        {monthLabels.map((month) => (
          <span key={`${month.weekIndex}-${month.label || "blank"}`} className="month-label">
            {month.label}
          </span>
        ))}
      </div>

      <div className="heatmap-layout">
        <div className="weekday-column" aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="heatmap-grid" role="grid" aria-label="GitHub contribution heatmap">
          {columns.flatMap((column, weekIndex) =>
            column.map((cell) => {
              if (!cell) {
                return null;
              }

              const contributionLabel =
                cell.contributionCount === 1
                  ? "1 contribution"
                  : `${cell.contributionCount.toLocaleString("en-US")} contributions`;

              return (
                <div
                  key={`${cell.date}-${weekIndex}-${cell.weekday}`}
                  className={`heatmap-cell level-${levelClassName(cell.level)}${cell.isPadding ? " is-padding" : ""}${
                    activeDate === cell.date ? " is-active" : ""
                  }`}
                  role="gridcell"
                  aria-label={`${cell.date}: ${contributionLabel}`}
                  title={`${cell.date}: ${contributionLabel}`}
                  style={{
                    gridColumn: weekIndex + 1,
                    gridRow: cell.weekday + 1,
                    backgroundColor: cell.color
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
