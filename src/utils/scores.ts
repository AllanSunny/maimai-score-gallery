import storedChartSummaries from "../data/scores/chart-summaries.json";
import { parseChartSummaries, parseScoreChunk } from "./data-validation";
import type { ScoreChunk } from "./types";

const modules = import.meta.glob<ScoreChunk>("../data/scores/????-??.json", {
  eager: true,
  import: "default",
});

export const scores = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([, chunk]) => parseScoreChunk(chunk).scores);

export const chartSummaries = parseChartSummaries(storedChartSummaries).charts;
