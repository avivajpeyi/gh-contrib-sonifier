import type { ContributionResponse } from "@github-contrib-sonifier/core";

const configuredBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

export function contributionsUrl(username: string) {
  const base = configuredBase || "";
  const path = `${base}/api/contributions?username=${encodeURIComponent(username)}`;
  return path;
}

export async function fetchContributionResponse(username: string): Promise<ContributionResponse> {
  const response = await fetch(contributionsUrl(username), {
    headers: {
      Accept: "application/json"
    }
  });

  const json = (await response.json()) as ContributionResponse | { error: string };
  if (!response.ok) {
    throw new Error("error" in json ? json.error : `Request failed with ${response.status}`);
  }

  return json as ContributionResponse;
}

