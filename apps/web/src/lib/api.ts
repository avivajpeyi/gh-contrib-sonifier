import type { ContributionResponse } from "@github-contrib-sonifier/core";

const configuredBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

function localOriginFallback() {
  if (typeof window === "undefined") {
    return null;
  }

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return origin;
  }

  return null;
}

export function resolvedApiBaseUrl() {
  return configuredBase || localOriginFallback();
}

export function contributionsUrl(username: string) {
  const base = resolvedApiBaseUrl();
  if (!base) {
    return null;
  }

  return `${base}/api/contributions?username=${encodeURIComponent(username)}`;
}

export async function fetchContributionResponse(username: string): Promise<ContributionResponse> {
  const url = contributionsUrl(username);
  if (!url) {
    throw new Error(
      "Missing API configuration. Set VITE_API_BASE_URL to your deployed API origin before using the GitHub Pages frontend."
    );
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (text.startsWith("<!doctype") || text.startsWith("<html")) {
      throw new Error(
        `API request returned HTML instead of JSON. Check VITE_API_BASE_URL and confirm ${url} points to your API, not GitHub Pages.`
      );
    }

    throw new Error(`API request returned an unexpected response type: ${contentType || "unknown"}`);
  }

  const json = (await response.json()) as ContributionResponse | { error?: string };
  if (!response.ok) {
    const message = "error" in json ? json.error : undefined;
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return json as ContributionResponse;
}
