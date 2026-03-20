import { DEFAULT_GITHUB_COLORS, GITHUB_LEVELS, type ContributionResponse } from "@github-contrib-sonifier/core";

import type { GitHubContributionDay } from "./github.js";

function coerceIsoDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function rollingWindowEndingAt(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 364);

  return {
    from: start.toISOString(),
    to: end.toISOString()
  };
}

export function normalizeContributionPayload(input: {
  username: string;
  generatedAt?: string;
  from: string;
  to: string;
  totalContributions: number;
  days: GitHubContributionDay[];
}): ContributionResponse {
  const fromDate = new Date(input.from);
  const toDate = new Date(input.to);

  const levelSet = new Set<string>(GITHUB_LEVELS);
  const days = input.days
    .filter((day) => {
      const dayDate = new Date(`${day.date}T00:00:00Z`);
      return dayDate >= fromDate && dayDate <= toDate;
    })
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((day) => ({
      date: coerceIsoDate(day.date),
      count: day.contributionCount,
      level: levelSet.has(day.contributionLevel) ? day.contributionLevel : "NONE",
      color:
        day.color || DEFAULT_GITHUB_COLORS[levelSet.has(day.contributionLevel) ? day.contributionLevel : "NONE"],
      weekday: day.weekday
    }));

  return {
    username: input.username,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    from: input.from,
    to: input.to,
    totalContributions: input.totalContributions,
    days
  };
}

