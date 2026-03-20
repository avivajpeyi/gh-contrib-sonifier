import type { ContributionLevel, InstrumentVoice, SequenceTrack } from "./types.js";

export const DEFAULT_GITHUB_COLORS: Record<ContributionLevel, string> = {
  NONE: "#161b22",
  FIRST_QUARTILE: "#9be9a8",
  SECOND_QUARTILE: "#40c463",
  THIRD_QUARTILE: "#30a14e",
  FOURTH_QUARTILE: "#216e39"
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const WEEKDAY_VOICES: Record<number, InstrumentVoice> = {
  0: "kick",
  1: "bass",
  2: "pad",
  3: "pad",
  4: "pad",
  5: "pad",
  6: "lead"
};

export const DEFAULT_TRACKS: SequenceTrack[] = WEEKDAY_LABELS.map((label, weekday) => ({
  weekday,
  label,
  voice: weekday === 6 ? "hat" : (WEEKDAY_VOICES[weekday] ?? "pad"),
  muted: false
}));

export const LEVEL_TO_INTENSITY: Record<ContributionLevel, number> = {
  NONE: 0,
  FIRST_QUARTILE: 0.3,
  SECOND_QUARTILE: 0.5,
  THIRD_QUARTILE: 0.72,
  FOURTH_QUARTILE: 0.95
};

export const SCALE_FREQUENCIES = [55, 65.41, 73.42, 82.41, 98, 110, 130.81, 146.83] as const;
