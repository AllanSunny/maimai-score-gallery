import type { ChartType, Difficulty } from "./types";

const japaneseChartTypes = {
  DX: "でらっくす",
  STD: "スタンダード",
} satisfies Record<ChartType, string>;

interface YouTubeChartSearchOptions {
  title: string;
  chartType: ChartType;
  difficulty: Difficulty;
  hasMultipleVersions: boolean;
}

export function youtubeChartSearchUrl({
  title,
  chartType,
  difficulty,
  hasMultipleVersions,
}: YouTubeChartSearchOptions) {
  const terms = [title];
  if (hasMultipleVersions) terms.push(japaneseChartTypes[chartType]);
  terms.push(difficulty, "maimai");

  const searchParams = new URLSearchParams({ search_query: terms.join(" ") });
  return `https://www.youtube.com/results?${searchParams}`;
}
