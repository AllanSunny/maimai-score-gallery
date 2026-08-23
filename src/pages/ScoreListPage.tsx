import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { scores } from "../utils/scores";
import { findCatalogSong } from "../utils/catalog";
import { SongInfo, type SongChartSummary } from "../components/song/SongInfo";
import { PageHeading } from "../components/ui/PageHeading";
import { allSongTitles } from "../utils/song-titles";
import type { ChartType, Difficulty, Score, SongTitles } from "../utils/types";

interface SongSummary {
  titles: SongTitles;
  chartType: ChartType;
  jacketUrl?: string | null;
  charts: SongChartSummary[];
}

const difficultyOrder: Difficulty[] = ["BASIC", "ADVANCED", "EXPERT", "MASTER", "Re:MASTER"];
const PAGE_SIZE = 30;
const LIST_STATE_KEY = "score-gallery:scores-list-state";

interface StoredListState {
  query: string;
  visibleCount: number;
  scrollY: number;
}

function readListState(): StoredListState {
  try {
    const value = JSON.parse(sessionStorage.getItem(LIST_STATE_KEY) ?? "null");
    return {
      query: typeof value?.query === "string" ? value.query : "",
      visibleCount: typeof value?.visibleCount === "number"
        ? Math.max(PAGE_SIZE, value.visibleCount)
        : PAGE_SIZE,
      scrollY: typeof value?.scrollY === "number" ? value.scrollY : 0,
    };
  } catch {
    return { query: "", visibleCount: PAGE_SIZE, scrollY: 0 };
  }
}

function groupScoresBySong(scores: Score[]): SongSummary[] {
  const songs = new Map<string, SongSummary>();

  scores.forEach((score) => {
    const metadata = findCatalogSong(score.songTitle, score.chartType);
    const titles = metadata?.titles ?? {
      canonical: score.songTitle,
      kana: [],
      romaji: [],
      english: [],
      aliases: [],
    };
    const canonicalTitle = titles.canonical;
    const songKey = `${canonicalTitle}\u0000${score.chartType}`;
    const song: SongSummary = songs.get(songKey) ?? {
      titles,
      chartType: score.chartType,
      jacketUrl: metadata?.jacketUrl,
      charts: (metadata?.charts ?? [])
        .map((chart): SongChartSummary => ({
          ...chart,
          chartType: score.chartType,
          chartConstant: chart.chartConstant ?? undefined,
        })),
    };
    const chartIndex = song.charts.findIndex(
      (chart) => chart.difficulty === score.difficulty && chart.chartType === score.chartType,
    );
    const metadataChart = metadata?.charts.find(
      (chart) => chart.difficulty === score.difficulty,
    );
    const chart: SongChartSummary = {
      id: metadataChart?.id ?? score.chartId,
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
    songs.set(songKey, song);
  });

  return [...songs.values()].sort((a, b) =>
    a.titles.canonical.localeCompare(b.titles.canonical) || a.chartType.localeCompare(b.chartType));
}

export function ScoreListPage() {
  const [initialState] = useState(readListState);
  const [query, setQuery] = useState(initialState.query);
  const [visibleCount, setVisibleCount] = useState(initialState.visibleCount);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);

  const songs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return groupScoresBySong(scores).filter((song) =>
      allSongTitles(song.titles).join(" ").toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  const visibleSongs = songs.slice(0, visibleCount);
  const hasMoreSongs = visibleCount < songs.length;

  useEffect(() => {
    const marker = loadMoreRef.current;
    if (!marker || !hasMoreSongs) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, songs.length));
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasMoreSongs, songs.length, visibleCount]);

  useLayoutEffect(() => {
    if (hasRestoredScroll.current) return;
    hasRestoredScroll.current = true;

    const frame = requestAnimationFrame(() => {
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, initialState.scrollY);
      root.style.scrollBehavior = previousBehavior;
    });

    return () => cancelAnimationFrame(frame);
  }, [initialState.scrollY, visibleSongs.length]);

  function handleSearch(queryValue: string) {
    setQuery(queryValue);
    setVisibleCount(PAGE_SIZE);
  }

  function preserveListPosition() {
    sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({
      query,
      visibleCount,
      scrollY: window.scrollY,
    } satisfies StoredListState));
  }

  return (
    <div>
      <PageHeading
        eyebrow="Score list"
        title="All records"
        description="Browse every recorded song. Select any difficulty to see its complete record and score history."
      />

      <label className="mt-10 block max-w-lg">
        <span className="sr-only">Search by song title</span>
        <input type="search" value={query} onChange={(event) => handleSearch(event.target.value)} placeholder="Search by song title…" className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-lightest/70 focus:border-coral focus:ring-3 focus:ring-coral/10" />
      </label>

      <div className="mt-8 grid gap-4" onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('a[href^="#/charts/"]')) preserveListPosition();
        }}>
          {visibleSongs.map((song) => <SongInfo key={`${song.titles.canonical}-${song.chartType}`} {...song} />)}
          {!songs.length && <p className="rounded-2xl border border-line p-10 text-center text-sm text-lightest">No matching songs.</p>}
          {songs.length > 0 && (
            <div ref={loadMoreRef} className="py-4 text-center">
              <p className="mb-3 text-xs text-lightest">
                Showing {visibleSongs.length} of {songs.length} songs
              </p>
              {hasMoreSongs && (
                <button type="button" onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, songs.length))} className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold transition hover:border-coral hover:bg-cream">
                  Load more
                </button>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
