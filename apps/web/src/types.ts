export interface ContributionDay {
  date: string;
  contributionCount: number;
  color: string;
  level: string;
  weekday: number;
}

export interface ContributionSummary {
  username: string;
  totalContributions: number;
  contributionData: ContributionDay[];
}
