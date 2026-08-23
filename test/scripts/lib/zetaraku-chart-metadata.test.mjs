import assert from "node:assert/strict";
import test from "node:test";
import { indexZetarakuChartMetadata } from "../../../scripts/lib/zetaraku-chart-metadata.mjs";

function payload(overrides = {}) {
  return {
    updateTime: "2026-08-21T01:13:03.602Z",
    songs: [{
      title: "Magical Flavor",
      artist: "曲：大国奏音/歌：烏屋茶房・黒魔",
      sheets: [{
        type: "dx",
        difficulty: "master",
        internalLevel: "13.2",
        noteDesigner: "Jack",
      }],
    }],
    ...overrides,
  };
}

function index(value = payload()) {
  return indexZetarakuChartMetadata(value, { minimumSongs: 1, minimumCharts: 1 });
}

test("maps an exact internal level to a numeric chart constant", () => {
  const metadata = index().metadata("Magical Flavor", "曲：大国奏音/歌：烏屋茶房・黒魔", "DX", "MASTER");
  assert.equal(metadata.chartConstant, 13.2);
});

test("maps the note designer to the charter", () => {
  const metadata = index().metadata("Magical Flavor", "曲：大国奏音/歌：烏屋茶房・黒魔", "DX", "MASTER");
  assert.equal(metadata.charter, "Jack");
});

test("falls back to a unique title and chart when the supplemental artist is empty", () => {
  const value = payload();
  value.songs[0].artist = "";
  const metadata = index(value).metadata("Magical Flavor", "Authoritative artist", "DX", "MASTER");
  assert.equal(metadata.chartConstant, 13.2);
});

test("does not treat a display-derived internal level value as an exact constant", () => {
  const value = payload();
  value.songs[0].sheets[0].internalLevel = null;
  value.songs[0].sheets[0].internalLevelValue = 13;
  assert.equal(index(value).metadata("Magical Flavor", "曲：大国奏音/歌：烏屋茶房・黒魔", "DX", "MASTER").chartConstant, null);
});

test("ignores UTAGE sheets", () => {
  const value = payload();
  value.songs[0].sheets.push({ type: "utage", difficulty: "【宴】", internalLevel: null, noteDesigner: "-" });
  assert.equal(index(value).metadata("Magical Flavor", "曲：大国奏音/歌：烏屋茶房・黒魔", "DX", "MASTER").chartConstant, 13.2);
});

test("rejects a missing songs collection", () => {
  assert.throws(() => index({ updateTime: "2026-08-21T01:13:03.602Z" }), /songs must be an array/);
});

test("rejects an invalid source update timestamp", () => {
  assert.throws(() => index(payload({ updateTime: "not-a-date" })), /updateTime must be an ISO timestamp/);
});

test("rejects an unsupported non-UTAGE chart type", () => {
  const value = payload();
  value.songs[0].sheets[0].type = "future-type";
  assert.throws(() => index(value), /unsupported chart type or difficulty/);
});

test("rejects duplicate artist-qualified chart keys", () => {
  const value = payload();
  value.songs[0].sheets.push(structuredClone(value.songs[0].sheets[0]));
  assert.throws(() => index(value), /duplicate chart/);
});

test("rejects a suspicious song coverage regression", () => {
  assert.throws(() => indexZetarakuChartMetadata(payload(), { minimumSongs: 2, minimumCharts: 1 }), /coverage regressed/);
});

test("rejects a suspicious chart coverage regression", () => {
  assert.throws(() => indexZetarakuChartMetadata(payload(), { minimumSongs: 1, minimumCharts: 2 }), /coverage regressed/);
});
