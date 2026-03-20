import type { ContributionDay, ContributionSummary } from "../types.js";

const CONTRIBUTIONS_API_ORIGIN = "https://github-contributions-api.deno.dev";
const FALLBACK_LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

function toIsoDate(value: string) {
  return value.slice(0, 10);
}

function inferLevel(value: unknown, count: number) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (count <= 0) {
    return "NONE";
  }

  if (count === 1) {
    return "FIRST_QUARTILE";
  }

  if (count <= 3) {
    return "SECOND_QUARTILE";
  }

  if (count <= 6) {
    return "THIRD_QUARTILE";
  }

  return "FOURTH_QUARTILE";
}

function normalizeDay(entry: Record<string, unknown>): ContributionDay | null {
  const rawDate = typeof entry.date === "string" ? entry.date : null;
  if (!rawDate) {
    return null;
  }

  const contributionCount = Number(entry.contributionCount ?? entry.count ?? 0);
  const weekday = Number(entry.weekday ?? new Date(`${toIsoDate(rawDate)}T00:00:00Z`).getUTCDay());
  const color = typeof entry.color === "string" ? entry.color : "#161b22";

  return {
    date: toIsoDate(rawDate),
    contributionCount: Number.isFinite(contributionCount) ? contributionCount : 0,
    color,
    level: inferLevel(entry.level, Number.isFinite(contributionCount) ? contributionCount : 0),
    weekday: Number.isFinite(weekday) ? weekday : 0
  };
}

function flattenContributions(payload: Record<string, unknown>): ContributionDay[] {
  const directContributions = Array.isArray(payload.contributions)
    ? payload.contributions
    : Array.isArray(payload.days)
      ? payload.days
      : [];

  if (directContributions.length > 0) {
    return directContributions
      .flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }

        if (Array.isArray((entry as { contributionDays?: unknown[] }).contributionDays)) {
          return ((entry as { contributionDays: unknown[] }).contributionDays).flatMap((day) => {
            if (!day || typeof day !== "object") {
              return [];
            }

            const normalized = normalizeDay(day as Record<string, unknown>);
            return normalized ? [normalized] : [];
          });
        }

        const normalized = normalizeDay(entry as Record<string, unknown>);
        return normalized ? [normalized] : [];
      })
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  const calendar = payload.contributionCalendar;
  if (!calendar || typeof calendar !== "object") {
    return [];
  }

  const weeks = Array.isArray((calendar as { weeks?: unknown[] }).weeks) ? (calendar as { weeks: unknown[] }).weeks : [];
  return weeks
    .flatMap((week) => {
      if (!week || typeof week !== "object") {
        return [];
      }

      const contributionDays = Array.isArray((week as { contributionDays?: unknown[] }).contributionDays)
        ? (week as { contributionDays: unknown[] }).contributionDays
        : [];

      return contributionDays.flatMap((day) => {
        if (!day || typeof day !== "object") {
          return [];
        }

        const normalized = normalizeDay(day as Record<string, unknown>);
        return normalized ? [normalized] : [];
      });
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function levelClassName(level: string) {
  const normalized = level.toUpperCase();
  return FALLBACK_LEVELS.includes(normalized) ? normalized.toLowerCase() : "none";
}

export async function fetchContributionSummary(username: string): Promise<ContributionSummary> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) {
    throw new Error("Enter a GitHub username before loading data.");
  }

  const response = await fetch(`${CONTRIBUTIONS_API_ORIGIN}/${encodeURIComponent(normalizedUsername)}.json`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not load contributions for @${normalizedUsername}. Request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const contributionData = flattenContributions(payload);

  if (contributionData.length === 0) {
    throw new Error(`The public proxy returned no contribution days for @${normalizedUsername}.`);
  }

  const totalContributions =
    typeof payload.totalContributions === "number"
      ? payload.totalContributions
      : contributionData.reduce((sum, day) => sum + day.contributionCount, 0);

  const payloadUsername =
    typeof payload.username === "string"
      ? payload.username
      : typeof payload.login === "string"
        ? payload.login
        : normalizedUsername;

  return {
    username: payloadUsername,
    totalContributions,
    contributionData
  };
}
