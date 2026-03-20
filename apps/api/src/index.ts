import { fetchGitHubContributionCalendar } from "./github.js";
import { normalizeContributionPayload, rollingWindowEndingAt } from "./normalize.js";

export interface ApiEnv {
  GITHUB_TOKEN?: string;
}

export async function getContributions(username: string, env: ApiEnv = process.env) {
  const token = env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("Missing GITHUB_TOKEN");
  }

  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error("Missing username");
  }

  const now = new Date();
  const window = rollingWindowEndingAt(now);
  const calendar = await fetchGitHubContributionCalendar(trimmed, token, window.from, window.to);
  const days = calendar.weeks.flatMap((week) => week.contributionDays);

  return normalizeContributionPayload({
    username: trimmed,
    generatedAt: now.toISOString(),
    from: window.from,
    to: window.to,
    totalContributions: calendar.totalContributions,
    days
  });
}

export async function handleContributionsRequest(request: Request, env: ApiEnv = process.env): Promise<Response> {
  const url = new URL(request.url);
  const username = url.searchParams.get("username") ?? "";

  if (!username.trim()) {
    return json(
      {
        error: "Missing username query parameter"
      },
      400
    );
  }

  try {
    const payload = await getContributions(username, env);
    return json(payload, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("No contribution calendar") ? 404 : 500;
    return json({ error: message }, status);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}

