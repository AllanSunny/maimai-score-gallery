import assert from "node:assert/strict";
import test from "node:test";
import { buildChartSummaries } from "../../../scripts/lib/chart-summaries.mjs";

function score(overrides) {
  return {
    id: "score",
    chartId: "song-dx-expert",
    playedAt: "2026-01-01T00:00:00.000Z",
    achievement: 90,
    combo: null,
    sync: null,
    ...overrides,
  };
}

test("chart summaries retain independent achievement, combo, and sync bests", () => {
  const charts = buildChartSummaries([
    score({ id: "achievement", achievement: 100.5 }),
    score({ id: "combo", achievement: 99, combo: "AP" }),
    score({ id: "sync", achievement: 98, combo: "FC", sync: "FDX+" }),
  ]);

  assert.equal("chartId" in charts["song-dx-expert"], false);
  assert.deepEqual(charts["song-dx-expert"].bestAchievement, {
    value: 100.5,
    scoreId: "achievement",
    playedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(charts["song-dx-expert"].bestCombo.scoreId, "combo");
  assert.equal(charts["song-dx-expert"].bestSync.scoreId, "sync");
});

test("same-status bests prefer the highest achievement and collect UTC history months", () => {
  const charts = buildChartSummaries([
    score({ id: "older", playedAt: "2025-12-31T23:00:00.000Z", achievement: 99, combo: "FC", sync: "Sync" }),
    score({ id: "higher", playedAt: "2026-01-01T01:00:00.000Z", achievement: 100, combo: "FC", sync: "Sync" }),
  ]);
  const summary = charts["song-dx-expert"];

  assert.equal(summary.playCount, 2);
  assert.equal(summary.bestCombo.scoreId, "higher");
  assert.equal(summary.bestSync.scoreId, "higher");
  assert.deepEqual(summary.historyChunks, ["2025-12", "2026-01"]);
});

test("scores without a chart ID are omitted until catalog linking completes", () => {
  assert.deepEqual(buildChartSummaries([score({ chartId: null })]), {});
});

test("charts without a combo achievement have no best combo", () => {
  const charts = buildChartSummaries([score({ combo: null })]);

  assert.equal(charts["song-dx-expert"].bestCombo, null);
});
