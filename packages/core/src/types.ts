export const GITHUB_LEVELS = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE"
] as const;

export type ContributionLevel = (typeof GITHUB_LEVELS)[number];

export interface ContributionDay {
  date: string;
  count: number;
  level: ContributionLevel;
  color: string;
  weekday: number;
}

export interface ContributionResponse {
  username: string;
  generatedAt: string;
  from: string;
  to: string;
  totalContributions: number;
  days: ContributionDay[];
}

export interface ContributionCell extends ContributionDay {
  weekIndex: number;
  isPadding: boolean;
}

export type ContributionWeekColumn = Array<ContributionCell | null>;
export type ContributionWeekRows = Array<Array<ContributionCell | null>>;

export type InstrumentVoice = "kick" | "bass" | "pad" | "lead" | "hat";

export interface SequenceEvent {
  id: string;
  username: string;
  date: string;
  weekIndex: number;
  weekday: number;
  count: number;
  level: ContributionLevel;
  voice: InstrumentVoice;
  startStep: number;
  durationSteps: number;
  velocity: number;
  frequencyHz?: number;
}

export interface SequenceTrack {
  weekday: number;
  label: string;
  voice: InstrumentVoice;
  muted: boolean;
}

export interface SequencedContributionCalendar {
  username: string;
  totalSteps: number;
  weekColumns: ContributionWeekColumn[];
  weekRows: ContributionWeekRows;
  tracks: SequenceTrack[];
  events: SequenceEvent[];
}

