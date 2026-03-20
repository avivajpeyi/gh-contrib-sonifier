import {
  DEFAULT_TRACKS,
  LEVEL_TO_INTENSITY,
  SCALE_FREQUENCIES,
  WEEKDAY_LABELS,
  WEEKDAY_VOICES
} from "./constants.js";
import { buildContributionGrid, buildContributionRows } from "./grid.js";
import type {
  ContributionCell,
  ContributionResponse,
  ContributionWeekColumn,
  InstrumentVoice,
  SequenceEvent,
  SequencedContributionCalendar
} from "./types.js";

function frequencyForCell(cell: ContributionCell): number {
  const scaleIndex = (cell.weekIndex + cell.weekday + cell.count) % SCALE_FREQUENCIES.length;
  const base = SCALE_FREQUENCIES[scaleIndex] ?? SCALE_FREQUENCIES[0];

  if (cell.weekday === 1) {
    return base / 2;
  }

  if (cell.weekday >= 2 && cell.weekday <= 5) {
    return base;
  }

  if (cell.weekday === 6) {
    return base * 2;
  }

  return base;
}

function voiceForWeekday(weekday: number): InstrumentVoice {
  if (weekday === 6) {
    return "lead";
  }

  return WEEKDAY_VOICES[weekday] ?? "pad";
}

export function sequenceWeekColumns(
  username: string,
  columns: ContributionWeekColumn[]
): SequenceEvent[] {
  const events: SequenceEvent[] = [];

  columns.forEach((column, weekIndex) => {
    column.forEach((cell) => {
      if (!cell || cell.isPadding || cell.level === "NONE" || cell.count <= 0) {
        return;
      }

      const velocity = LEVEL_TO_INTENSITY[cell.level];
      const voice = voiceForWeekday(cell.weekday);
      const event: SequenceEvent = {
        id: `${cell.date}-${voice}`,
        username,
        date: cell.date,
        weekIndex,
        weekday: cell.weekday,
        count: cell.count,
        level: cell.level,
        voice,
        startStep: weekIndex,
        durationSteps: voice === "pad" ? 2 : 1,
        velocity
      };

      if (voice !== "kick") {
        event.frequencyHz = frequencyForCell(cell);
      }

      events.push(event);

      if (cell.weekday === 6) {
        events.push({
          id: `${cell.date}-hat`,
          username,
          date: cell.date,
          weekIndex,
          weekday: cell.weekday,
          count: cell.count,
          level: cell.level,
          voice: "hat",
          startStep: weekIndex,
          durationSteps: 1,
          velocity: Math.min(1, velocity + 0.08)
        });
      }
    });
  });

  return events.sort((left, right) => {
    if (left.startStep !== right.startStep) {
      return left.startStep - right.startStep;
    }

    return left.weekday - right.weekday;
  });
}

export function sequenceContributionResponse(
  response: ContributionResponse,
  totalColumns = 53
): SequencedContributionCalendar {
  const weekColumns = buildContributionGrid(response, totalColumns);
  const weekRows = buildContributionRows(weekColumns);

  return {
    username: response.username,
    totalSteps: weekColumns.length,
    weekColumns,
    weekRows,
    tracks: DEFAULT_TRACKS.map((track) => ({
      ...track,
      voice: track.weekday === 6 ? "lead" : track.voice
    })),
    events: sequenceWeekColumns(response.username, weekColumns)
  };
}

export function describeTrack(weekday: number): string {
  const label = WEEKDAY_LABELS[weekday] ?? "Day";

  switch (weekday) {
    case 0:
      return `${label} kick`;
    case 1:
      return `${label} bass`;
    case 6:
      return `${label} hats and lead`;
    default:
      return `${label} pad`;
  }
}
