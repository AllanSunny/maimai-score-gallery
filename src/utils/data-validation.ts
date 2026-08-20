import type {
  ChartType,
  ChartSummaries,
  ComboStatus,
  Difficulty,
  GeneratedCatalog,
  ScoreChunk,
} from "./types";

const chartTypes = new Set<ChartType>(["DX", "STD"]);
const comboStatuses = new Set<ComboStatus>(["Clear", "FC", "FC+", "AP", "AP+"]);
const syncStatuses = new Set(["Sync", "FS", "FS+", "FDX", "FDX+"]);
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

function nonemptyString(value: unknown, path: string): asserts value is string {
  string(value, path);
  if (!value.trim()) throw new Error(`${path} must not be empty.`);
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

function validateSongTitles(value: unknown, path: string) {
  const titles = object(value, path);
  nonemptyString(titles.canonical, `${path}.canonical`);
  const seen = new Map([[titles.canonical.normalize("NFKC").toLocaleLowerCase(), `${path}.canonical`]]);
  ["kana", "romaji", "english", "aliases"].forEach((category) => {
    array(titles[category], `${path}.${category}`).forEach((title, index) => {
      const titlePath = `${path}.${category}[${index}]`;
      nonemptyString(title, titlePath);
      lowercaseString(title, titlePath);
      const normalized = title.normalize("NFKC").toLocaleLowerCase();
      const existingPath = seen.get(normalized);
      if (existingPath) throw new Error(`${titlePath} duplicates ${existingPath}.`);
      seen.set(normalized, titlePath);
    });
  });
}

function validateChart(value: unknown, path: string) {
  const chart = object(value, path);
  string(chart.id, `${path}.id`);
  string(chart.difficulty, `${path}.difficulty`);
  if (!difficulties.has(chart.difficulty as Difficulty)) throw new Error(`${path}.difficulty is invalid.`);
  string(chart.level, `${path}.level`);
  if (chart.chartConstant !== null) number(chart.chartConstant, `${path}.chartConstant`);
  nullableString(chart.charter, `${path}.charter`);
}

function validateJudgments(value: unknown, path: string) {
  const judgments = object(value, path);
  if (judgments.criticalPerfect !== null) {
    number(judgments.criticalPerfect, `${path}.criticalPerfect`);
  }
  ["perfect", "great", "good", "miss"].forEach((field) =>
    number(judgments[field], `${path}.${field}`));
}

export function parseGeneratedCatalog(value: unknown): GeneratedCatalog {
  const catalog = object(value, "catalog");
  string(catalog.generatedAt, "catalog.generatedAt");
  array(catalog.songs, "catalog.songs").forEach((songValue, songIndex) => {
    const path = `catalog.songs[${songIndex}]`;
    const song = object(songValue, path);
    string(song.id, `${path}.id`);
    validateSongTitles(song.titles, `${path}.titles`);
    nonemptyString(song.artist, `${path}.artist`);
    nonemptyString(song.genre, `${path}.genre`);
    if (song.introducedIn !== null) {
      const introducedIn = object(song.introducedIn, `${path}.introducedIn`);
      if (introducedIn.code !== null) nonemptyString(introducedIn.code, `${path}.introducedIn.code`);
      nonemptyString(introducedIn.name, `${path}.introducedIn.name`);
    }
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
  return value as GeneratedCatalog;
}

function validateScores(value: unknown, path: string) {
  array(value, path).forEach((scoreValue, index) => {
    const scorePath = `${path}[${index}]`;
    const score = object(scoreValue, scorePath);
    ["id", "playedAt", "songTitle", "chartType", "difficulty", "level", "combo"].forEach((field) => string(score[field], `${scorePath}.${field}`));
    nullableString(score.sync, `${scorePath}.sync`);
    if (!comboStatuses.has(score.combo as ComboStatus)) throw new Error(`${scorePath}.combo is invalid.`);
    if (score.sync !== null && !syncStatuses.has(score.sync as string)) throw new Error(`${scorePath}.sync is invalid.`);
    nonemptyString(score.chartId, `${scorePath}.chartId`);
    if (!chartTypes.has(score.chartType as ChartType)) throw new Error(`${scorePath}.chartType is invalid.`);
    if (!difficulties.has(score.difficulty as Difficulty)) throw new Error(`${scorePath}.difficulty is invalid.`);
    ["achievement", "rating", "ratingChange"].forEach((field) => number(score[field], `${scorePath}.${field}`));
    ["fast", "slow"].forEach((field) => {
      if (score[field] !== null) number(score[field], `${scorePath}.${field}`);
    });
    if (score.chartConstant !== undefined) number(score.chartConstant, `${scorePath}.chartConstant`);
    if (score.judgments !== null) validateJudgments(score.judgments, `${scorePath}.judgments`);
    if (score.judgmentsByType !== null) {
      const breakdown = object(score.judgmentsByType, `${scorePath}.judgmentsByType`);
      ["break", "tap", "hold", "slide", "touch"].forEach((noteType) =>
        validateJudgments(breakdown[noteType], `${scorePath}.judgmentsByType.${noteType}`));
    }
  });
}

export function parseScoreChunk(value: unknown): ScoreChunk {
  const chunk = object(value, "scoreChunk");
  string(chunk.period, "scoreChunk.period");
  if (!/^\d{4}-\d{2}$/.test(chunk.period)) throw new Error("scoreChunk.period must use YYYY-MM.");
  validateScores(chunk.scores, "scoreChunk.scores");
  (chunk.scores as Record<string, unknown>[]).forEach((score, index) => {
    const playedAt = score.playedAt as string;
    if (playedAt.slice(0, 7) !== chunk.period) {
      throw new Error(`scoreChunk.scores[${index}] does not belong to ${chunk.period}.`);
    }
  });
  return value as ScoreChunk;
}

export function parseChartSummaries(value: unknown): ChartSummaries {
  const summary = object(value, "chartSummaries");
  string(summary.generatedAt, "chartSummaries.generatedAt");
  const charts = object(summary.charts, "chartSummaries.charts");
  Object.entries(charts).forEach(([chartId, summaryValue]) => {
    const path = `chartSummaries.charts.${chartId}`;
    const chart = object(summaryValue, path);
    number(chart.playCount, `${path}.playCount`);
    const achievement = object(chart.bestAchievement, `${path}.bestAchievement`);
    number(achievement.value, `${path}.bestAchievement.value`);
    ["scoreId", "playedAt"].forEach((field) => nonemptyString(achievement[field], `${path}.bestAchievement.${field}`));
    const combo = object(chart.bestCombo, `${path}.bestCombo`);
    ["status", "scoreId", "playedAt"].forEach((field) => nonemptyString(combo[field], `${path}.bestCombo.${field}`));
    if (chart.bestSync !== null) {
      const sync = object(chart.bestSync, `${path}.bestSync`);
      ["status", "scoreId", "playedAt"].forEach((field) => nonemptyString(sync[field], `${path}.bestSync.${field}`));
    }
    array(chart.historyChunks, `${path}.historyChunks`).forEach((period, index) => {
      string(period, `${path}.historyChunks[${index}]`);
      if (!/^\d{4}-\d{2}$/.test(period)) throw new Error(`${path}.historyChunks[${index}] must use YYYY-MM.`);
    });
  });
  return value as ChartSummaries;
}
