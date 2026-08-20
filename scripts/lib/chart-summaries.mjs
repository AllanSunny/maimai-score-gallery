import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { scoreMonth } from "./monthly-score-archive.mjs";

export const CHART_SUMMARIES_PATH = path.join(
  process.cwd(), "src", "data", "scores", "chart-summaries.json",
);

const comboRanks = new Map([
  ["Clear", 0],
  ["FC", 1],
  ["FC+", 2],
  ["AP", 3],
  ["AP+", 4],
]);
const syncRanks = new Map([
  ["Sync", 1],
  ["FS", 2],
  ["FS+", 3],
  ["FDX", 4],
  ["FDX+", 5],
]);

function scoreReference(score) {
  return { scoreId: score.id, playedAt: score.playedAt };
}

function tieBreakScore(left, right) {
  return Number(left.achievement) - Number(right.achievement)
    || left.playedAt.localeCompare(right.playedAt)
    || left.id.localeCompare(right.id);
}

function bestScore(scores, primaryComparison) {
  return scores.reduce((best, score) => (
    !best || primaryComparison(score, best) > 0
      || (primaryComparison(score, best) === 0 && tieBreakScore(score, best) > 0)
      ? score
      : best
  ), null);
}

export function buildChartSummaries(scores) {
  const byChart = new Map();
  scores.forEach((score) => {
    if (!score.chartId) return;
    const entries = byChart.get(score.chartId) ?? [];
    entries.push(score);
    byChart.set(score.chartId, entries);
  });

  const charts = {};
  [...byChart].sort(([a], [b]) => a.localeCompare(b)).forEach(([chartId, entries]) => {
    const bestAchievementScore = bestScore(entries, (left, right) =>
      Number(left.achievement) - Number(right.achievement));
    const bestComboScore = bestScore(entries, (left, right) =>
      (comboRanks.get(left.combo) ?? -1) - (comboRanks.get(right.combo) ?? -1));
    const syncScores = entries.filter((score) => score.sync !== null);
    const bestSyncScore = bestScore(syncScores, (left, right) =>
      (syncRanks.get(left.sync) ?? -1) - (syncRanks.get(right.sync) ?? -1));

    charts[chartId] = {
      playCount: entries.length,
      bestAchievement: {
        value: Number(bestAchievementScore.achievement),
        ...scoreReference(bestAchievementScore),
      },
      bestCombo: {
        status: bestComboScore.combo,
        ...scoreReference(bestComboScore),
      },
      bestSync: bestSyncScore ? {
        status: bestSyncScore.sync,
        ...scoreReference(bestSyncScore),
      } : null,
      historyChunks: [...new Set(entries.map(scoreMonth))].sort(),
    };
  });

  return charts;
}

export async function writeChartSummaries(scores, filePath = CHART_SUMMARIES_PATH) {
  const charts = buildChartSummaries(scores);
  const previous = await readFile(filePath, "utf8")
    .then(JSON.parse)
    .catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });

  if (previous && JSON.stringify(previous.charts) === JSON.stringify(charts)) {
    return { changed: false, chartCount: Object.keys(charts).length };
  }

  const summary = { generatedAt: new Date().toISOString(), charts };
  await writeFile(filePath, `${JSON.stringify(summary, null, 2)}\n`);
  return { changed: true, chartCount: Object.keys(charts).length };
}
