import { useEffect, useMemo, useState } from "react";
import { fetchScores } from "../api";
import { findCatalogSong } from "../catalog";
import { SongDetailFrame } from "../components/song/SongDetailFrame";
import { PageHeading } from "../components/ui/PageHeading";
import { achievementRank } from "../rank";
import type { ChartType, Difficulty, Score } from "../types";

interface ChartDetailPageProps {
  songName: string;
  chartType: ChartType;
  difficulty: Difficulty;
}

export function ChartDetailPage({ songName, chartType, difficulty }: ChartDetailPageProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const metadata = findCatalogSong(songName, chartType);
  const chartMetadata = metadata?.charts.find((chart) => chart.difficulty === difficulty);

  useEffect(() => {
    fetchScores()
      .then(({ scores: results }) => setScores(results))
      .finally(() => setLoading(false));
  }, []);

  const history = useMemo(() => {
    const chartId = chartMetadata?.id;
    return scores
      .filter((score) => chartId
        ? score.chartId === chartId
        : score.songTitle === songName && score.chartType === chartType && score.difficulty === difficulty)
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  }, [chartMetadata?.id, chartType, difficulty, scores, songName]);
  const record = history.reduce<Score | undefined>((best, score) => !best || score.achievement > best.achievement ? score : best, undefined);

  return (
    <div>
      <a href="#/scores" className="mb-8 inline-block text-sm text-muted hover:text-ink">← All scores</a>
      <PageHeading eyebrow={`${difficulty} · ${chartType}`} title={songName} description="Detailed chart statistics and score progression over time." />

      {loading ? <p className="mt-10 text-sm text-muted">Loading chart history…</p> : (
        <>
          <section className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
            {metadata?.jacketUrl && (
              <SongDetailFrame
                title={metadata.title}
                artist={metadata.artist}
                jacketUrl={metadata.jacketUrl}
                chartType={chartType}
                difficulty={difficulty}
                level={chartMetadata?.level ?? record?.level ?? "?"}
                className="mx-auto w-full max-w-80 lg:mx-0"
              />
            )}
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border border-line bg-white/60 p-5"><p className="text-xs uppercase tracking-wider text-muted">Current record</p><p className="mt-2 text-2xl font-semibold tabular-nums">{record ? `${record.achievement.toFixed(4)}%` : "—"}</p>{record && <p className="mt-1 text-sm font-semibold text-muted">{achievementRank(record.achievement)}</p>}</div>
              <div className="rounded-2xl border border-line bg-white/60 p-5"><p className="text-xs uppercase tracking-wider text-muted">Level</p><p className="mt-2 text-2xl font-semibold">{chartMetadata?.level ?? record?.level ?? "—"}</p></div>
              <div className="rounded-2xl border border-line bg-white/60 p-5"><p className="text-xs uppercase tracking-wider text-muted">Chart constant</p><p className="mt-2 text-2xl font-semibold">{chartMetadata?.chartConstant?.toFixed(1) ?? record?.chartConstant?.toFixed(1) ?? "—"}</p></div>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">Score progression</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white/60">
              {history.map((score) => <div key={score.id} className="flex justify-between border-b border-line p-5 text-sm last:border-0"><time className="text-muted">{new Date(score.playedAt).toLocaleDateString()}</time><span className="text-right"><span className="block font-semibold tabular-nums">{score.achievement.toFixed(4)}%</span><span className="mt-1 block text-xs font-semibold text-muted">{achievementRank(score.achievement)}</span></span></div>)}
              {!history.length && <p className="p-10 text-center text-sm text-muted">No plays recorded for this chart yet.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
