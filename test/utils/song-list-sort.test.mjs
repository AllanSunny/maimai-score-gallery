import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule() {
  const transpile = (source) => ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const filterSource = await readFile(new URL("../../src/utils/song-list-filter.ts", import.meta.url), "utf8");
  const filterModuleUrl = `data:text/javascript;base64,${Buffer.from(transpile(filterSource)).toString("base64")}`;
  const source = await readFile(new URL("../../src/utils/song-list-sort.ts", import.meta.url), "utf8");
  const compiled = transpile(source.replace(
    'import { matchingSongCharts, type ScoreListFilters } from "./song-list-filter";',
    `import { matchingSongCharts } from "${filterModuleUrl}";`,
  ));
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const scoreListSort = await importTypeScriptModule();

function chart(overrides = {}) {
  return {
    id: "chart", difficulty: "MASTER", chartType: "DX", level: "13", chartConstant: 13,
    achievement: 100, bestCombo: "FC", bestSync: "Sync", lastPlayedAt: "2026-01-01T00:00:00Z", playCount: 1,
    ...overrides,
  };
}

function song(name, songCharts, overrides = {}) {
  return {
    titles: { canonical: name, kana: [], romaji: [], english: [], aliases: [], ...overrides.titles },
    searchText: name.toLocaleLowerCase(), catalogSong: { genre: overrides.genre ?? "maimai" },
    versions: [{ chartType: "DX", charts: songCharts }], lastPlayedAt: songCharts[0]?.lastPlayedAt ?? null,
  };
}

const filters = (overrides = {}) => ({ combos: [], syncs: [], difficulties: [], genres: [], levels: [], playedOnly: false, ...overrides });
const sortedNames = (songs, sort, direction = "desc", activeFilters = filters()) =>
  scoreListSort.filterAndSortSongs(songs, activeFilters, sort, direction).map(({ titles }) => titles.canonical);

test("recent sorting uses only matching charts", () => {
  const a = song("A", [chart({ difficulty: "MASTER", lastPlayedAt: "2025-01-01" }), chart({ difficulty: "BASIC", lastPlayedAt: "2026-01-01" })]);
  const b = song("B", [chart({ difficulty: "MASTER", lastPlayedAt: "2025-06-01" })]);
  assert.deepEqual(sortedNames([a, b], "recent", "desc", filters({ difficulties: ["MASTER"] })), ["B", "A"]);
});

test("English title sorting uses translated titles", () => {
  const englishFirst = song("Z", [chart()], { titles: { english: ["Alpha"] } });
  const englishSecond = song("A", [chart()], { titles: { english: ["Beta"] } });
  assert.deepEqual(sortedNames([englishSecond, englishFirst], "title-english", "asc"), ["Z", "A"]);
});

test("Japanese title sorting uses kana readings", () => {
  const japaneseFirst = song("Z", [chart()], { titles: { kana: ["あ"] } });
  const japaneseSecond = song("A", [chart()], { titles: { kana: ["か"] } });
  assert.deepEqual(sortedNames([japaneseSecond, japaneseFirst], "title-japanese", "asc"), ["Z", "A"]);
});

test("level sorting uses only matching charts", () => {
  const lower = song("Lower", [chart({ difficulty: "MASTER", level: "12", chartConstant: 12, achievement: 99 }), chart({ difficulty: "BASIC", level: "15", chartConstant: 15 })]);
  const higher = song("Higher", [chart({ difficulty: "MASTER", level: "13", chartConstant: 13, achievement: 100 })]);
  assert.deepEqual(sortedNames([lower, higher], "level", "desc", filters({ difficulties: ["MASTER"] })), ["Higher", "Lower"]);
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

test("achievement sorting falls back to plus levels when constants are unavailable", () => {
  const plain = song("Plain", [chart({ achievement: 100, level: "13", chartConstant: undefined })]);
  const plus = song("Plus", [chart({ achievement: 100, level: "13+", chartConstant: undefined })]);
  assert.deepEqual(sortedNames([plain, plus], "achievement", "desc"), ["Plus", "Plain"]);
});

test("play count sorting totals only matching charts", () => {
  const lower = song("Lower", [chart({ difficulty: "MASTER", playCount: 2 }), chart({ difficulty: "BASIC", playCount: 100 })]);
  const higher = song("Higher", [chart({ difficulty: "MASTER", playCount: 3 })]);
  assert.deepEqual(sortedNames([lower, higher], "play-count", "desc", filters({ difficulties: ["MASTER"] })), ["Higher", "Lower"]);
});

test("play count sorting breaks ties by achievement", () => {
  const lower = song("Lower", [chart({ playCount: 2, achievement: 99 })]);
  const higher = song("Higher", [chart({ playCount: 2, achievement: 100 })]);
  assert.deepEqual(sortedNames([lower, higher], "play-count", "desc"), ["Higher", "Lower"]);
});

test("title sorts label and point down for ascending reading order", () => {
  assert.equal(scoreListSort.sortDirectionLabel("title-english", "asc"), "A–Z");
  assert.equal(scoreListSort.sortDirectionLabel("title-japanese", "asc"), "あ–ん");
  assert.equal(scoreListSort.sortArrowPointsDown("title-english", "asc"), true);
});

test("title sorts label and point up for reverse reading order", () => {
  assert.equal(scoreListSort.sortDirectionLabel("title-english", "desc"), "Z–A");
  assert.equal(scoreListSort.sortArrowPointsDown("title-english", "desc"), false);
});

test("recent and metric sorts point down for newest or highest first", () => {
  assert.equal(scoreListSort.sortDirectionLabel("recent", "desc"), "Newest first");
  assert.equal(scoreListSort.sortDirectionLabel("level", "desc"), "Highest first");
  assert.equal(scoreListSort.sortArrowPointsDown("play-count", "asc"), false);
});

test("switching sort groups preserves the visible arrow direction", () => {
  assert.equal(scoreListSort.directionForSortChange("recent", "title-english", "desc"), "asc");
  assert.equal(scoreListSort.directionForSortChange("achievement", "title-japanese", "asc"), "desc");
  assert.equal(scoreListSort.directionForSortChange("title-english", "recent", "asc"), "desc");
});

test("switching within a sort group preserves the selected order", () => {
  assert.equal(scoreListSort.directionForSortChange("title-english", "title-japanese", "desc"), "desc");
  assert.equal(scoreListSort.directionForSortChange("recent", "achievement", "asc"), "asc");
});
