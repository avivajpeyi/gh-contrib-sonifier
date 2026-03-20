import type { ContributionLevel } from "@github-contrib-sonifier/core";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export interface GitHubContributionDay {
  date: string;
  contributionCount: number;
  color: string;
  contributionLevel: ContributionLevel;
  weekday: number;
}

interface GitHubGraphqlResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: Array<{
            contributionDays: GitHubContributionDay[];
          }>;
        };
      };
    };
  };
  errors?: unknown;
}

const contributionQuery = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              color
              contributionLevel
              weekday
            }
          }
        }
      }
    }
  }
`;

export async function fetchGitHubContributionCalendar(
  username: string,
  token: string,
  from: string,
  to: string
) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-contrib-sonifier-api"
    },
    body: JSON.stringify({
      query: contributionQuery,
      variables: {
        login: username,
        from,
        to
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as GitHubGraphqlResponse;

  if (json.errors) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;

  if (!calendar) {
    throw new Error(`No contribution calendar returned for "${username}"`);
  }

  return calendar;
}

