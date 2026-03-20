# github-contrib-sonifier

A pnpm workspace monorepo for a public web app that fetches a GitHub user's last 365 days of public contributions, renders them as a GitHub-style heatmap, and sonifies the grid in the browser.

## Workspace

```text
apps/
  api/         Serverless-friendly TypeScript API for GitHub GraphQL fetching
  web/         Vite + React frontend for GitHub Pages
packages/
  core/        Shared types, normalization helpers, grid transforms, sequencing logic
  web-audio/   Browser playback engine built on Web Audio
```

## Why The Split Exists

The frontend is designed to be deployable to GitHub Pages, which is static hosting only.

Arbitrary live username lookup requires a separate API service because GitHub GraphQL requests need a `GITHUB_TOKEN`, and that token cannot be securely embedded in a GitHub Pages frontend. The web app calls `/api/contributions?username=<name>` and expects a normalized JSON payload from the API.

## API Response Schema

The API returns:

```json
{
  "username": "octocat",
  "generatedAt": "2026-03-20T00:00:00.000Z",
  "from": "2025-03-22T00:00:00.000Z",
  "to": "2026-03-20T00:00:00.000Z",
  "totalContributions": 1234,
  "days": [
    {
      "date": "2026-03-20",
      "count": 4,
      "level": "THIRD_QUARTILE",
      "color": "#30a14e",
      "weekday": 5
    }
  ]
}
```

## Local Development

Requirements:

- Node.js 20+
- pnpm 10+
- A GitHub personal access token with access to public GitHub GraphQL queries

Install:

```bash
pnpm install
```

Run the API:

```bash
cd apps/api
GITHUB_TOKEN=your_token_here pnpm dev
```

The API will listen on `http://localhost:8787` and expose:

```text
GET /api/contributions?username=octocat
```

Run the frontend in a separate terminal:

```bash
cd apps/web
VITE_API_BASE_URL=http://localhost:8787 pnpm dev
```

## Build And Test

Build all packages and apps:

```bash
pnpm build
```

Typecheck the workspace:

```bash
pnpm typecheck
```

Run core sequencing tests:

```bash
pnpm test
```

## Deployment Notes

### Frontend

The frontend is configured for GitHub Pages via [`.github/workflows/deploy-web.yml`](/Users/avi/Documents/personal/gh-contrib-sonifier/.github/workflows/deploy-web.yml). The Vite base path is derived from `GITHUB_REPOSITORY` by default, or you can override it with `VITE_BASE_PATH`.

To point the frontend at a deployed API, set the repository variable `VITE_API_BASE_URL` in GitHub Actions or provide it during build.

If `VITE_API_BASE_URL` is missing in a GitHub Pages deployment, the frontend now refuses to issue the request and shows a configuration error instead of accidentally fetching the Pages HTML shell.

### API

`apps/api/src/index.ts` exposes `handleContributionsRequest(request, env)` so the logic can be adapted to a serverless runtime without rewriting the GitHub fetch or normalization flow.

The included local dev server in [apps/api/src/dev.ts](/Users/avi/Documents/personal/gh-contrib-sonifier/apps/api/src/dev.ts) is only for development.

## Architecture Notes

- `packages/core` is pure and has no browser or server side effects.
- Sequencing is deterministic and testable so future offline rendering can reuse the same event model.
- `packages/web-audio` consumes shared sequence events but stays independent from React.
- MP3 export is intentionally not implemented in this first pass, but the shared event model is intended to support future offline rendering work.
