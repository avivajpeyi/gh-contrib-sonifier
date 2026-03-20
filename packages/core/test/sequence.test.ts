import { describe, expect, it } from "vitest";

import { buildContributionGrid, sequenceContributionResponse } from "../src/index.js";
import type { ContributionResponse } from "../src/index.js";

const fixture: ContributionResponse = {
  username: "avi",
  generatedAt: "2026-03-20T00:00:00.000Z",
  from: "2025-03-21T00:00:00.000Z",
  to: "2026-03-20T00:00:00.000Z",
  totalContributions: 8,
  days: [
    { date: "2026-03-16", count: 1, level: "FIRST_QUARTILE", color: "#9be9a8", weekday: 1 },
    { date: "2026-03-18", count: 3, level: "SECOND_QUARTILE", color: "#40c463", weekday: 3 },
    { date: "2026-03-20", count: 4, level: "THIRD_QUARTILE", color: "#30a14e", weekday: 5 },
    { date: "2026-03-14", count: 2, level: "SECOND_QUARTILE", color: "#40c463", weekday: 6 }
  ]
};

describe("buildContributionGrid", () => {
  it("builds a fixed 53x7 matrix", () => {
    const grid = buildContributionGrid(fixture);

    expect(grid).toHaveLength(53);
    expect(grid.every((column) => column.length === 7)).toBe(true);
  });
});

describe("sequenceContributionResponse", () => {
  it("creates deterministic events by week and weekday", () => {
    const first = sequenceContributionResponse(fixture);
    const second = sequenceContributionResponse(fixture);

    expect(first.events).toEqual(second.events);
    expect(first.events.map((event) => event.voice)).toContain("bass");
    expect(first.events.map((event) => event.voice)).toContain("lead");
    expect(first.events.map((event) => event.voice)).toContain("hat");
  });
});
