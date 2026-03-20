import { monthTickLabels, type ContributionWeekColumn } from "@github-contrib-sonifier/core";

interface HeatmapProps {
  columns: ContributionWeekColumn[];
  activeWeek: number | null;
}

export function Heatmap({ columns, activeWeek }: HeatmapProps) {
  const months = monthTickLabels(columns);

  return (
    <div className="heatmap-shell">
      <div className="month-row" aria-hidden="true">
        {Array.from({ length: columns.length }).map((_, weekIndex) => {
          const label = months.find((month) => month.weekIndex === weekIndex)?.label ?? "";
          return (
            <span key={weekIndex} className="month-label">
              {label}
            </span>
          );
        })}
      </div>
      <div className="heatmap-grid" role="grid" aria-label="GitHub contribution heatmap">
        {columns.flatMap((column, weekIndex) =>
          column.map((cell, weekday) => {
            if (!cell) {
              return null;
            }

            const countLabel =
              cell.count === 1 ? "1 contribution" : `${cell.count.toLocaleString("en-US")} contributions`;

            return (
              <div
                key={`${cell.date}-${weekday}`}
                className={`heatmap-cell${activeWeek === weekIndex ? " is-active" : ""}${cell.isPadding ? " is-padding" : ""}`}
                role="gridcell"
                aria-label={`${cell.date}: ${countLabel}`}
                title={`${cell.date}: ${countLabel}`}
                style={{
                  gridColumn: weekIndex + 1,
                  gridRow: weekday + 1,
                  backgroundColor: cell.color
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

