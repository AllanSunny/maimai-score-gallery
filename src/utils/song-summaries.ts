import { findAlternateCatalogChart, findCatalogSong } from "./catalog";
import { songSearchText } from "./song-titles";
import { difficulties } from "./types";
import type {
  ChartRecordSummary,
  ChartType,
  Difficulty,
  Score,
  SongChartSummary,
  SongSummary,
} from "./types";

const chartTypeOrder = { DX: 0, STD: 1 } satisfies Record<ChartType, number>;

function summarizeCatalogChart(
  chart: { id: string; difficulty: Difficulty; level: string; chartConstant: number | null },
  chartType: ChartType,
  chartSummaries: Record<string, ChartRecordSummary>,
): SongChartSummary {
  const summary = chartSummaries[chart.id];
  return {
    ...chart,
    chartType,
    chartConstant: chart.chartConstant ?? undefined,
    achievement: summary?.bestAchievement.value,
    bestCombo: summary?.bestCombo?.status,
    bestSync: summary?.bestSync?.status,
    lastPlayedAt: summary?.lastPlayedAt ?? null,
    playCount: summary?.playCount ?? 0,
  };
}

export function groupScoresBySong(
  scores: Score[],
  chartSummaries: Record<string, ChartRecordSummary>,
): SongSummary[] {
  const songs = new Map<string, SongSummary>();

  scores.forEach((score) => {
    const metadata = findCatalogSong(score.songTitle, score.chartType);
    const titles = metadata?.song.titles ?? {
      canonical: score.songTitle,
      kana: [],
      romaji: [],
      english: [],
      aliases: [],
    };
    const songKey = titles.canonical;
    const song = songs.get(songKey) ?? {
      titles,
      searchText: songSearchText(titles),
      catalogSong: metadata?.song,
      versions: [],
      lastPlayedAt: null,
    };
    let version = song.versions.find((candidate) => candidate.chartType === score.chartType);

    if (!version) {
      version = {
        chartType: score.chartType,
        charts: (metadata?.version.charts ?? []).map((chart) =>
          summarizeCatalogChart(chart, score.chartType, chartSummaries)),
      };
      song.versions.push(version);

      const alternateChart = metadata?.version.charts[0]
        && findAlternateCatalogChart(metadata.version.charts[0].id);
      const alternate = alternateChart?.song.versions.find(
        (candidate) => candidate.chartType === alternateChart.version.chartType,
      );
      if (alternate && !song.versions.some((candidate) => candidate.chartType === alternate.chartType)) {
        song.versions.push({
          chartType: alternate.chartType,
          charts: alternate.charts.map((chart) =>
            summarizeCatalogChart(chart, alternate.chartType, chartSummaries)),
        });
      }
      song.versions.sort((a, b) => chartTypeOrder[a.chartType] - chartTypeOrder[b.chartType]);
    }

    const chartIndex = version.charts.findIndex(
      (chart) => chart.difficulty === score.difficulty && chart.chartType === score.chartType,
    );
    const metadataChart = metadata?.version.charts.find(
      (chart) => chart.difficulty === score.difficulty,
    );
    const chartId = metadataChart?.id ?? score.chartId;
    const summary = chartSummaries[chartId];
    const chart: SongChartSummary = {
      id: chartId,
      difficulty: score.difficulty,
      chartType: score.chartType,
      level: metadataChart?.level ?? score.level,
      chartConstant: metadataChart?.chartConstant ?? score.chartConstant,
      achievement: summary?.bestAchievement.value ?? score.achievement,
      bestCombo: summary?.bestCombo?.status,
      bestSync: summary?.bestSync?.status,
      lastPlayedAt: summary?.lastPlayedAt ?? null,
      playCount: summary?.playCount ?? 0,
    };

    if (chartIndex === -1) {
      version.charts.push(chart);
    } else if ((version.charts[chartIndex].achievement ?? 0) < score.achievement) {
      version.charts[chartIndex] = chart;
    }

    version.charts.sort((a, b) =>
      difficulties.indexOf(a.difficulty) - difficulties.indexOf(b.difficulty));
    songs.set(songKey, song);
  });

  return [...songs.values()]
    .map((song) => ({
      ...song,
      lastPlayedAt: song.versions
        .flatMap((version) => version.charts)
        .map((chart) => chartSummaries[chart.id]?.lastPlayedAt ?? null)
        .reduce<string | null>((latest, playedAt) =>
          playedAt !== null && (latest === null || playedAt.localeCompare(latest) > 0)
            ? playedAt
            : latest, null),
    }))
    .sort((a, b) =>
      (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? "")
      || a.titles.canonical.localeCompare(b.titles.canonical));
}
