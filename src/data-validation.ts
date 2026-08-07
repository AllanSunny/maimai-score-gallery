import type {
  ChartType,
  Difficulty,
  GeneratedCatalog,
  ScoresResponse,
} from "./types";

const chartTypes = new Set<ChartType>(["DX", "STD"]);
const difficulties = new Set<Difficulty>(["BASIC", "ADVANCED", "EXPERT", "MASTER", "Re:MASTER"]);

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object.`);
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);
  return value;
}

function string(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${path} must be a string.`);
}

function number(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path} must be a finite number.`);
}

function nullableString(value: unknown, path: string) {
  if (value !== null) string(value, path);
}

function lowercaseString(value: unknown, path: string) {
  string(value, path);
  if (value !== value.toLocaleLowerCase()) throw new Error(`${path} must be lowercase.`);
}

function validateChart(value: unknown, path: string) {
  const chart = object(value, path);
  string(chart.id, `${path}.id`);
  string(chart.difficulty, `${path}.difficulty`);
  if (!difficulties.has(chart.difficulty as Difficulty)) throw new Error(`${path}.difficulty is invalid.`);
  string(chart.level, `${path}.level`);
  if (chart.chartConstant !== null) number(chart.chartConstant, `${path}.chartConstant`);
}

function validateJudgments(value: unknown, path: string) {
  const judgments = object(value, path);
  ["criticalPerfect", "perfect", "great", "good", "miss"].forEach((field) =>
    number(judgments[field], `${path}.${field}`));
}

export function parseGeneratedCatalog(value: unknown): GeneratedCatalog {
  const catalog = object(value, "catalog");
  string(catalog.generatedAt, "catalog.generatedAt");
  array(catalog.songs, "catalog.songs").forEach((songValue, songIndex) => {
    const path = `catalog.songs[${songIndex}]`;
    const song = object(songValue, path);
    string(song.id, `${path}.id`);
    string(song.title, `${path}.title`);
    array(song.alternateTitles, `${path}.alternateTitles`).forEach((title, index) => lowercaseString(title, `${path}.alternateTitles[${index}]`));
    nullableString(song.jacketKey, `${path}.jacketKey`);
    array(song.versions, `${path}.versions`).forEach((versionValue, versionIndex) => {
      const versionPath = `${path}.versions[${versionIndex}]`;
      const version = object(versionValue, versionPath);
      string(version.id, `${versionPath}.id`);
      string(version.chartType, `${versionPath}.chartType`);
      if (!chartTypes.has(version.chartType as ChartType)) throw new Error(`${versionPath}.chartType is invalid.`);
      array(version.charts, `${versionPath}.charts`).forEach((chart, chartIndex) => validateChart(chart, `${versionPath}.charts[${chartIndex}]`));
    });
  });
  array(catalog.unmatchedSongs, "catalog.unmatchedSongs").forEach((entryValue, index) => {
    const path = `catalog.unmatchedSongs[${index}]`;
    const entry = object(entryValue, path);
    ["title", "reason", "firstSeenAt", "lastAttemptedAt"].forEach((field) => string(entry[field], `${path}.${field}`));
  });
  return value as GeneratedCatalog;
}

export function parseScoresResponse(value: unknown): ScoresResponse {
  const archive = object(value, "scoreArchive");
  string(archive.updatedAt, "scoreArchive.updatedAt");
  array(archive.scores, "scoreArchive.scores").forEach((scoreValue, index) => {
    const path = `scoreArchive.scores[${index}]`;
    const score = object(scoreValue, path);
    ["id", "playedAt", "songTitle", "chartType", "difficulty", "level", "rank", "combo", "sync"].forEach((field) => string(score[field], `${path}.${field}`));
    nullableString(score.chartId, `${path}.chartId`);
    if (!chartTypes.has(score.chartType as ChartType)) throw new Error(`${path}.chartType is invalid.`);
    if (!difficulties.has(score.difficulty as Difficulty)) throw new Error(`${path}.difficulty is invalid.`);
    ["achievement", "rating", "ratingChange", "fast", "slow"].forEach((field) => number(score[field], `${path}.${field}`));
    if (score.chartConstant !== undefined) number(score.chartConstant, `${path}.chartConstant`);
    validateJudgments(score.judgments, `${path}.judgments`);
    if (score.judgmentsByType !== null) {
      const breakdown = object(score.judgmentsByType, `${path}.judgmentsByType`);
      ["break", "tap", "hold", "slide", "touch"].forEach((noteType) =>
        validateJudgments(breakdown[noteType], `${path}.judgmentsByType.${noteType}`));
    }
  });
  return value as ScoresResponse;
}
