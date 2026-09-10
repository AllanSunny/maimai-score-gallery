import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule() {
  const transpile = (source) => ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const scoreListSource = await readFile(new URL("../../src/utils/score-list.ts", import.meta.url), "utf8");
  const compiledScoreList = transpile(scoreListSource);
  return import(`data:text/javascript;base64,${Buffer.from(compiledScoreList).toString("base64")}`);
}

const scoreList = await importTypeScriptModule();

function chart(overrides = {}) {
  return {
    id: "chart",
    difficulty: "MASTER",
    chartType: "DX",
    level: "13",
    chartConstant: 13,
    achievement: 100,
    bestCombo: "FC",
    bestSync: "Sync",
    lastPlayedAt: "2026-01-01T00:00:00Z",
    playCount: 1,
    ...overrides,
  };
}

function song(name, songCharts, overrides = {}) {
  return {
    titles: {
      canonical: name,
      kana: [],
      romaji: [],
      english: [],
      aliases: [],
      ...overrides.titles,
    },
    searchText: name.toLocaleLowerCase(),
    catalogSong: { genre: overrides.genre ?? "maimai" },
    versions: [{ chartType: "DX", charts: songCharts }],
    lastPlayedAt: overrides.lastPlayedAt ?? songCharts[0]?.lastPlayedAt ?? null,
  };
}

function filters(overrides = {}) {
  return { ...scoreList.emptyScoreListFilters, ...overrides };
}

function sortedNames(songs, sort, direction = "desc", activeFilters = filters()) {
  return scoreList.filterAndSortSongs(songs, activeFilters, sort, direction)
    .map(({ titles }) => titles.canonical);
}

test("chart filters must be satisfied by the same chart", () => {
  const splitMatch = song("Split", [chart({ difficulty: "MASTER", level: "12" }), chart({ difficulty: "BASIC", level: "13" })]);
  const exactMatch = song("Exact", [chart({ difficulty: "MASTER", level: "13" })]);
  assert.deepEqual(sortedNames([splitMatch, exactMatch], "recent", "desc", filters({ difficulties: ["MASTER"], levels: ["13"] })), ["Exact"]);
});

test("null combo filters match charts without a combo status", () => {
  const noCombo = song("No combo", [chart({ bestCombo: null })]);
  const fullCombo = song("Full combo", [chart({ bestCombo: "FC" })]);
  assert.deepEqual(sortedNames([fullCombo, noCombo], "recent", "desc", filters({ combos: [null] })), ["No combo"]);
});

test("active filter count includes every selected value and played only", () => {
  assert.equal(scoreList.activeScoreListFilterCount(filters({ combos: ["FC", "AP"], genres: ["maimai"], playedOnly: true })), 4);
});

test("clearing the last chart selector also clears played only", () => {
  const current = filters({ difficulties: ["MASTER"], playedOnly: true });
  assert.equal(scoreList.updateScoreListFilter(current, "difficulties", []).playedOnly, false);
});

test("played only remains set while a level selector exists", () => {
  const current = filters({ difficulties: ["MASTER"], levels: ["13"], playedOnly: true });
  assert.equal(scoreList.updateScoreListFilter(current, "difficulties", []).playedOnly, true);
});

test("filter options contain sorted unique genres", () => {
  const songs = [song("B", [chart()], { genre: "Touhou" }), song("A", [chart()], { genre: "maimai" }), song("C", [chart()], { genre: "Touhou" })];
  assert.deepEqual(scoreList.scoreListFilterOptions(songs).genres, ["Touhou", "maimai"]);
});

test("filter options contain descending unique levels", () => {
  const songs = [song("A", [chart({ level: "13" }), chart({ level: "14+" }), chart({ level: "14" })])];
  assert.deepEqual(scoreList.scoreListFilterOptions(songs).levels, ["14+", "14", "13"]);
});

test("recent sorting uses only matching charts", () => {
  const a = song("A", [chart({ difficulty: "MASTER", lastPlayedAt: "2025-01-01" }), chart({ difficulty: "BASIC", lastPlayedAt: "2026-01-01" })]);
  const b = song("B", [chart({ difficulty: "MASTER", lastPlayedAt: "2025-06-01" })]);
  assert.deepEqual(sortedNames([a, b], "recent", "desc", filters({ difficulties: ["MASTER"] })), ["B", "A"]);
});

test("English title sorting uses translated titles", () => {
  const a = song("Z", [chart()], { titles: { english: ["Alpha"] } });
  const b = song("A", [chart()], { titles: { english: ["Beta"] } });
  assert.deepEqual(sortedNames([b, a], "title-english", "asc"), ["Z", "A"]);
});

test("Japanese title sorting uses kana readings", () => {
  const a = song("Z", [chart()], { titles: { kana: ["あ"] } });
  const b = song("A", [chart()], { titles: { kana: ["か"] } });
  assert.deepEqual(sortedNames([b, a], "title-japanese", "asc"), ["Z", "A"]);
});

test("level sorting uses only matching charts", () => {
  const a = song("A", [chart({ difficulty: "MASTER", level: "12", chartConstant: 12 }), chart({ difficulty: "BASIC", level: "15", chartConstant: 15 })]);
  const b = song("B", [chart({ difficulty: "MASTER", level: "13", chartConstant: 13 })]);
  assert.deepEqual(sortedNames([a, b], "level", "desc", filters({ difficulties: ["MASTER"] })), ["B", "A"]);
});

test("level sorting breaks ties by achievement", () => {
  const lower = song("Lower", [chart({ level: "13", chartConstant: 13, achievement: 99 })]);
  const higher = song("Higher", [chart({ level: "13", chartConstant: 13, achievement: 100 })]);
  assert.deepEqual(sortedNames([lower, higher], "level", "desc"), ["Higher", "Lower"]);
});

test("achievement sorting uses the highest matching achievement", () => {
  const lower = song("Lower", [chart({ achievement: 99 })]);
  const higher = song("Higher", [chart({ achievement: 100 })]);
  assert.deepEqual(sortedNames([lower, higher], "achievement", "desc"), ["Higher", "Lower"]);
});

test("achievement sorting breaks ties by chart constant", () => {
  const lower = song("Lower", [chart({ achievement: 100, level: "13", chartConstant: 13.1 })]);
  const higher = song("Higher", [chart({ achievement: 100, level: "13", chartConstant: 13.9 })]);
  assert.deepEqual(sortedNames([lower, higher], "achievement", "desc"), ["Higher", "Lower"]);
});

test("achievement sorting falls back to plus levels for ties without constants", () => {
  const plain = song("Plain", [chart({ achievement: 100, level: "13", chartConstant: undefined })]);
  const plus = song("Plus", [chart({ achievement: 100, level: "13+", chartConstant: undefined })]);
  assert.deepEqual(sortedNames([plain, plus], "achievement", "desc"), ["Plus", "Plain"]);
});

test("play count sorting totals only matching charts", () => {
  const a = song("A", [chart({ difficulty: "MASTER", playCount: 2 }), chart({ difficulty: "BASIC", playCount: 100 })]);
  const b = song("B", [chart({ difficulty: "MASTER", playCount: 3 })]);
  assert.deepEqual(sortedNames([a, b], "play-count", "desc", filters({ difficulties: ["MASTER"] })), ["B", "A"]);
});

test("play count sorting breaks ties by achievement", () => {
  const lower = song("Lower", [chart({ playCount: 2, achievement: 99 })]);
  const higher = song("Higher", [chart({ playCount: 2, achievement: 100 })]);
  assert.deepEqual(sortedNames([lower, higher], "play-count", "desc"), ["Higher", "Lower"]);
});
