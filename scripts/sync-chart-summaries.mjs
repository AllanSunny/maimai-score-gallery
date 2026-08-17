import { writeChartSummaries } from "./lib/chart-summaries.mjs";
import { readMonthlyScoreArchive } from "./lib/monthly-score-archive.mjs";

const archive = await readMonthlyScoreArchive();
const result = await writeChartSummaries(archive.scores);
console.log(
  result.changed
    ? `Updated ${result.chartCount} chart summaries.`
    : `Chart summaries are current (${result.chartCount} charts).`,
);
