import assert from "node:assert/strict";
import test from "node:test";
import { indexDxRatingChartMetadata } from "../../../scripts/lib/dxrating-chart-metadata.mjs";

function payload(overrides = {}) {
  return {
    songs: [{
      title: "My First Phone",
      artist: "cubesato",
      sheets: [{
        type: "std",
        difficulty: "advanced",
        level: "8+",
        internalLevelValue: 8.6,
        noteDesigner: "Jack",
        regions: { jp: true, intl: true },
      }],
    }],
    ...overrides,
  };
}

function index(value = payload()) {
  return indexDxRatingChartMetadata(value, { minimumSongs: 1, minimumCharts: 1 });
}

test("keeps a pinned snapshot's display level and exact constant together", () => {
  assert.deepEqual(index().metadata("My First Phone", "cubesato", "STD", "ADVANCED"), {
    level: "8+",
    chartConstant: 8.6,
    charter: "Jack",
  });
});

test("falls back to a unique title and chart", () => {
  assert.equal(index().metadata("My First Phone", "Different artist", "STD", "ADVANCED").chartConstant, 8.6);
});

test("indexes an upstream song with no artist when its title is unique", () => {
  const value = payload();
  value.songs[0].artist = null;
  assert.equal(index(value).metadata("My First Phone", "cubesato", "STD", "ADVANCED").chartConstant, 8.6);
});

test("ignores charts unavailable internationally", () => {
  const value = payload();
  value.songs[0].sheets[0].regions.intl = false;
  assert.deepEqual(indexDxRatingChartMetadata(value, { minimumSongs: 1, minimumCharts: 0 })
    .metadata("My First Phone", "cubesato", "STD", "ADVANCED"), {});
});

test("rejects a missing exact constant instead of deriving one", () => {
  const value = payload();
  delete value.songs[0].sheets[0].internalLevelValue;
  assert.throws(() => index(value), /internalLevelValue must be a finite number/);
});

test("rejects duplicate artist-qualified charts", () => {
  const value = payload();
  value.songs[0].sheets.push(structuredClone(value.songs[0].sheets[0]));
  assert.throws(() => index(value), /duplicate chart/);
});

test("rejects coverage regressions", () => {
  assert.throws(() => indexDxRatingChartMetadata(payload(), { minimumSongs: 2, minimumCharts: 1 }), /coverage regressed/);
});
