import { useEffect, useMemo, useState } from "react";
import { fetchScores } from "../api";
import { findCatalogSong } from "../catalog";
import { SongInfo, type SongChartSummary } from "../components/song/SongInfo";
import { PageHeading } from "../components/ui/PageHeading";
import type { Difficulty, Score } from "../types";

interface SongSummary {
  name: string;
  alternateTitles: string[];
  jacketUrl?: string | null;
  charts: SongChartSummary[];
}

const difficultyOrder: Difficulty[] = ["BASIC", "ADVANCED", "EXPERT", "MASTER", "Re:MASTER"];

function groupScoresBySong(scores: Score[]): SongSummary[] {
  const songs = new Map<string, SongSummary>();

  scores.forEach((score) => {
    const metadata = findCatalogSong(score.songTitle);
    const canonicalTitle = metadata?.title ?? score.songTitle;
    const song: SongSummary = songs.get(canonicalTitle) ?? {
      name: canonicalTitle,
      alternateTitles: [...(metadata?.alternateTitles ?? [])],
      jacketUrl: metadata?.jacketUrl,
      charts: (metadata?.charts ?? []).map((chart): SongChartSummary => ({
        ...chart,
        chartConstant: chart.chartConstant ?? undefined,
      })),
    };
    score.alternateTitles?.forEach((title) => {
      const normalizedTitle = title.trim();
      if (normalizedTitle && normalizedTitle !== score.songTitle && !song.alternateTitles.includes(normalizedTitle)) {
        song.alternateTitles.push(normalizedTitle);
      }
    });
    const chartIndex = song.charts.findIndex(
      (chart) => chart.difficulty === score.difficulty && chart.chartType === score.chartType,
    );
    const metadataChart = metadata?.charts.find(
      (chart) => chart.difficulty === score.difficulty && chart.chartType === score.chartType,
    );
    const chart: SongChartSummary = {
      difficulty: score.difficulty,
      chartType: score.chartType,
      level: metadataChart?.level ?? score.level,
      chartConstant: metadataChart?.chartConstant ?? score.chartConstant,
      achievement: score.achievement,
    };

    if (chartIndex === -1) {
      song.charts.push(chart);
    } else if ((song.charts[chartIndex].achievement ?? 0) < score.achievement) {
      song.charts[chartIndex] = chart;
    }

    song.charts.sort((a, b) => difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty));
    songs.set(canonicalTitle, song);
  });

  return [...songs.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function ScoreListPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchScores()
      .then(({ scores: results }) => setScores(results))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const songs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return groupScoresBySong(scores).filter((song) =>
      [song.name, ...song.alternateTitles].join(" ").toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query, scores]);

  return (
    <div>
      <PageHeading
        eyebrow="Score list"
        title="All records"
        description="Browse every recorded song. Select any difficulty to see its complete record and score history."
      />

      <label className="mt-10 block max-w-lg">
        <span className="sr-only">Search by song title</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by song title…" className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-coral focus:ring-3 focus:ring-coral/10" />
      </label>

      {error && <p className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">Unable to load scores: {error}</p>}
      {loading && <p className="mt-10 text-sm text-muted">Loading scores…</p>}

      {!loading && (
        <div className="mt-8 grid gap-4">
          {songs.map((song) => <SongInfo key={song.name} {...song} />)}
          {!songs.length && <p className="rounded-2xl border border-line p-10 text-center text-sm text-muted">No matching songs.</p>}
        </div>
      )}
    </div>
  );
}
