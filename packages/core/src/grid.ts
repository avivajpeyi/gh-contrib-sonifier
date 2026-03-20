import { DEFAULT_GITHUB_COLORS } from "./constants.js";
import type {
  ContributionCell,
  ContributionDay,
  ContributionResponse,
  ContributionWeekColumn,
  ContributionWeekRows
} from "./types.js";

function isoDateAtUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function buildContributionGrid(
  response: ContributionResponse,
  totalColumns = 53
): ContributionWeekColumn[] {
  const toDate = parseIsoDate(response.to.slice(0, 10));
  const end = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - ((totalColumns * 7) - 1));

  const sourceByDate = new Map(response.days.map((day) => [day.date, day]));
  const columns: ContributionWeekColumn[] = Array.from({ length: totalColumns }, () =>
    Array.from({ length: 7 }, () => null)
  );

  for (let offset = 0; offset < totalColumns * 7; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const isoDate = isoDateAtUtc(date);
    const weekday = date.getUTCDay();
    const weekIndex = Math.floor(offset / 7);
    const sourceDay = sourceByDate.get(isoDate);

    const cell: ContributionCell = {
      date: isoDate,
      count: sourceDay?.count ?? 0,
      level: sourceDay?.level ?? "NONE",
      color: sourceDay?.color ?? DEFAULT_GITHUB_COLORS[sourceDay?.level ?? "NONE"],
      weekday,
      weekIndex,
      isPadding: !sourceDay
    };

    const column = columns[weekIndex];
    if (!column) {
      continue;
    }

    column[weekday] = cell;
  }

  return columns;
}

export function buildContributionRows(columns: ContributionWeekColumn[]): ContributionWeekRows {
  const rows: ContributionWeekRows = Array.from({ length: 7 }, () =>
    Array.from({ length: columns.length }, () => null)
  );

  for (const column of columns) {
    for (const cell of column) {
      if (!cell) {
        continue;
      }

      const row = rows[cell.weekday];
      if (!row) {
        continue;
      }

      row[cell.weekIndex] = cell;
    }
  }

  return rows;
}

export function monthTickLabels(columns: ContributionWeekColumn[]): Array<{ weekIndex: number; label: string }> {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const seen = new Set<string>();
  const labels: Array<{ weekIndex: number; label: string }> = [];

  columns.forEach((column, weekIndex) => {
    const firstDay = column.find((cell): cell is ContributionCell => cell !== null && !cell.isPadding);
    if (!firstDay) {
      return;
    }

    const date = parseIsoDate(firstDay.date);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;

    if (!seen.has(key) && date.getUTCDate() <= 7) {
      seen.add(key);
      labels.push({ weekIndex, label: formatter.format(date) });
    }
  });

  return labels;
}

export function trimToResponseDays(columns: ContributionWeekColumn[], response: ContributionResponse): ContributionDay[] {
  const daySet = new Set(response.days.map((day) => day.date));
  return columns
    .flat()
    .filter((cell): cell is ContributionCell => cell !== null && daySet.has(cell.date))
    .map(({ weekIndex: _weekIndex, isPadding: _isPadding, ...day }) => day);
}
