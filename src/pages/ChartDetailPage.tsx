import { useEffect, useMemo, useState } from "react";
import { fetchScores } from "../api";
import { findCatalogSong } from "../catalog";
import { PageHeading } from "../components/ui/PageHeading";
import type { ChartType, Difficulty, Score } from "../types";

interface ChartDetailPageProps {
  songName: string;
  chartType: ChartType;
  difficulty: Difficulty;
}

export function ChartDetailPage({ songName, chartType, difficulty }: ChartDetailPageProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores()
      .then(({ scores: results }) => setScores(results))
      .finally(() => setLoading(false));
  }, []);

  const history = useMemo(() => {
    const metadata = findCatalogSong(songName, chartType);
    const chartId = metadata?.charts.find((chart) => chart.difficulty === difficulty)?.id;
    return scores
      .filter((score) => chartId
        ? score.chartId === chartId
        : score.songTitle === songName && score.chartType === chartType && score.difficulty === difficulty)
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  }, [chartType, difficulty, scores, songName]);
  const record = history.reduce<Score | undefined>((best, score) => !best || score.achievement > best.achievement ? score : best, undefined);

  return (
    <div>
      <a href="#/scores" className="mb-8 inline-block text-sm text-muted hover:text-ink">← All scores</a>
      <PageHeading eyebrow={`${difficulty} · ${chartType}`} title={songName} description="Detailed chart statistics and score progression over time." />

      {loading ? <p className="mt-10 text-sm text-muted">Loading chart history…</p> : (
        <>
          <section className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/60 p-5"><p className="text-xs uppercase tracking-wider text-muted">Current record</p><p className="mt-2 text-2xl font-semibold tabular-nums">{record ? `${record.achievement.toFixed(4)}%` : "—"}</p></div>
            <div className="rounded-2xl border border-line bg-white/60 p-5"><p className="text-xs uppercase tracking-wider text-muted">Level</p><p className="mt-2 text-2xl font-semibold">{record?.level ?? "—"}</p></div>
            <div className="rounded-2xl border border-line bg-white/60 p-5"><p className="text-xs uppercase tracking-wider text-muted">Chart constant</p><p className="mt-2 text-2xl font-semibold">{record?.chartConstant?.toFixed(1) ?? "—"}</p></div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">Score progression</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white/60">
              {history.map((score) => <div key={score.id} className="flex justify-between border-b border-line p-5 text-sm last:border-0"><time className="text-muted">{new Date(score.playedAt).toLocaleDateString()}</time><span className="font-semibold tabular-nums">{score.achievement.toFixed(4)}%</span></div>)}
              {!history.length && <p className="p-10 text-center text-sm text-muted">No plays recorded for this chart yet.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
