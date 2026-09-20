import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule() {
  const source = await readFile(new URL("../../src/utils/song-list-filter.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const scoreListFilter = await importTypeScriptModule();

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
    titles: { canonical: name, kana: [], romaji: [], english: [], aliases: [] },
    searchText: name.toLocaleLowerCase(),
    catalogSong: { genre: overrides.genre ?? "maimai" },
    versions: [{ chartType: "DX", charts: songCharts }],
    lastPlayedAt: songCharts[0]?.lastPlayedAt ?? null,
  };
}

function filters(overrides = {}) {
  return { ...scoreListFilter.emptyScoreListFilters, ...overrides };
}

test("chart filters must be satisfied by the same chart", () => {
  const splitMatch = song("Split", [chart({ id: "master", difficulty: "MASTER", level: "12" }), chart({ id: "basic", difficulty: "BASIC", level: "13" })]);
  assert.deepEqual(
    scoreListFilter.matchingSongCharts(splitMatch, filters({ difficulties: ["MASTER"], levels: ["13"] })),
    [],
  );
});

test("null combo filters match charts without a combo status", () => {
  const noCombo = song("No combo", [chart({ bestCombo: null })]);
  assert.equal(scoreListFilter.matchingSongCharts(noCombo, filters({ combos: [null] })).length, 1);
});

test("active filter count includes every selected value and played only", () => {
  assert.equal(scoreListFilter.activeScoreListFilterCount(filters({ combos: ["FC", "AP"], genres: ["maimai"], playedOnly: true })), 4);
});

test("clearing the last chart selector also clears played only", () => {
  const current = filters({ difficulties: ["MASTER"], playedOnly: true });
  assert.equal(scoreListFilter.updateScoreListFilter(current, "difficulties", []).playedOnly, false);
});

test("played only remains set while a level selector exists", () => {
  const current = filters({ difficulties: ["MASTER"], levels: ["13"], playedOnly: true });
  assert.equal(scoreListFilter.updateScoreListFilter(current, "difficulties", []).playedOnly, true);
});

test("filter options contain sorted unique genres", () => {
  const songs = [song("B", [chart()], { genre: "Touhou" }), song("A", [chart()], { genre: "maimai" }), song("C", [chart()], { genre: "Touhou" })];
  assert.deepEqual(scoreListFilter.scoreListFilterOptions(songs).genres, ["Touhou", "maimai"]);
});

test("filter options contain descending unique levels", () => {
  const songs = [song("A", [chart({ level: "13" }), chart({ level: "14+" }), chart({ level: "14" })])];
  assert.deepEqual(scoreListFilter.scoreListFilterOptions(songs).levels, ["14+", "14", "13"]);
});
