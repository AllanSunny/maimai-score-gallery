import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { chartSummaries, scores } from "../utils/scores";
import { findAlternateCatalogChart, findCatalogSong } from "../utils/catalog";
import { SongInfo } from "../components/song/SongInfo";
import { PageHeading } from "../components/ui/PageHeading";
import { allSongTitles } from "../utils/song-titles";
import type { ChartType, Difficulty, Score, SongChartSummary, SongSummary } from "../utils/types";
import { flushSync } from "react-dom";

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

function currentGridColumnCount() {
  if (typeof window === "undefined") return 2;
  if (window.innerWidth >= 1024) return 6;
  if (window.innerWidth >= 848) return 5;
  if (window.innerWidth >= 688) return 4;
  if (window.innerWidth >= 528) return 3;
  return 2;
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
    const songKey = canonicalTitle;
    const song: SongSummary = songs.get(songKey) ?? {
      titles,
      jacketUrl: metadata?.jacketUrl,
      versions: [],
    };
    let version = song.versions.find((candidate) => candidate.chartType === score.chartType);
    if (!version) {
      version = {
        chartType: score.chartType,
        charts: (metadata?.charts ?? []).map((chart): SongChartSummary => ({
          ...chart,
          chartType: score.chartType,
          chartConstant: chart.chartConstant ?? undefined,
          achievement: chartSummaries[chart.id]?.bestAchievement.value,
          bestCombo: chartSummaries[chart.id]?.bestCombo?.status,
          bestSync: chartSummaries[chart.id]?.bestSync?.status,
        })),
      };
      song.versions.push(version);

      const alternate = metadata?.charts[0] && findAlternateCatalogChart(metadata.charts[0].id)?.song;
      if (alternate && !song.versions.some((candidate) => candidate.chartType === alternate.chartType)) {
        song.versions.push({
          chartType: alternate.chartType,
          charts: alternate.charts.map((chart): SongChartSummary => ({
            ...chart,
            chartType: alternate.chartType,
            chartConstant: chart.chartConstant ?? undefined,
            achievement: chartSummaries[chart.id]?.bestAchievement.value,
            bestCombo: chartSummaries[chart.id]?.bestCombo?.status,
            bestSync: chartSummaries[chart.id]?.bestSync?.status,
          })),
        });
      }
      song.versions.sort((a, b) => ({ DX: 0, STD: 1 } satisfies Record<ChartType, number>)[a.chartType] - ({ DX: 0, STD: 1 } satisfies Record<ChartType, number>)[b.chartType]);
    }
    const chartIndex = version.charts.findIndex(
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
      achievement: chartSummaries[metadataChart?.id ?? score.chartId]?.bestAchievement.value ?? score.achievement,
      bestCombo: chartSummaries[metadataChart?.id ?? score.chartId]?.bestCombo?.status,
      bestSync: chartSummaries[metadataChart?.id ?? score.chartId]?.bestSync?.status,
    };

    if (chartIndex === -1) {
      version.charts.push(chart);
    } else if ((version.charts[chartIndex].achievement ?? 0) < score.achievement) {
      version.charts[chartIndex] = chart;
    }

    version.charts.sort((a, b) => difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty));
    songs.set(songKey, song);
  });

  return [...songs.values()].sort((a, b) =>
    a.titles.canonical.localeCompare(b.titles.canonical));
}

export function ScoreListPage() {
  const [initialState] = useState(readListState);
  const [query, setQuery] = useState(initialState.query);
  const [visibleCount, setVisibleCount] = useState(initialState.visibleCount);
  const [expandedSongKey, setExpandedSongKey] = useState<string | null>(null);
  const [gridColumnCount, setGridColumnCount] = useState(currentGridColumnCount);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);
  const isChangingSelection = useRef(false);

  const songs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return groupScoresBySong(scores).filter((song) =>
      allSongTitles(song.titles).join(" ").toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  const visibleSongs = songs.slice(0, visibleCount);
  const selectedSong = visibleSongs.find((song) => song.titles.canonical === expandedSongKey);
  const selectedSongIndex = selectedSong ? visibleSongs.indexOf(selectedSong) : -1;
  const selectedRowStart = selectedSongIndex < 0
    ? -1
    : Math.floor(selectedSongIndex / gridColumnCount) * gridColumnCount;
  const arrangedSongs = selectedSong
    ? [
        ...visibleSongs.slice(0, selectedRowStart),
        selectedSong,
        ...visibleSongs.slice(selectedRowStart).filter((song) => song !== selectedSong),
      ]
    : visibleSongs;
  const hasMoreSongs = visibleCount < songs.length;

  useEffect(() => {
    const updateGridColumnCount = () => setGridColumnCount(currentGridColumnCount());
    window.addEventListener("resize", updateGridColumnCount);
    return () => window.removeEventListener("resize", updateGridColumnCount);
  }, []);

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
    setExpandedSongKey(null);
  }

  function preserveListPosition() {
    sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({
      query,
      visibleCount,
      scrollY: window.scrollY,
    } satisfies StoredListState));
  }

  function visibleCardRects() {
    return new Map([...document.querySelectorAll<HTMLElement>("[data-song-key]")]
      .filter((card) => {
        const rect = card.getBoundingClientRect();
        return rect.bottom >= 0 && rect.top <= window.innerHeight;
      })
      .map((card) => [card.dataset.songKey!, {
        element: card,
        rect: card.getBoundingClientRect(),
      }]));
  }

  function lockPageInteraction() {
    const shield = document.createElement("div");
    Object.assign(shield.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      touchAction: "none",
    });
    shield.setAttribute("aria-hidden", "true");

    const preventInteraction = (event: Event) => event.preventDefault();
    shield.addEventListener("wheel", preventInteraction, { passive: false });
    shield.addEventListener("touchmove", preventInteraction, { passive: false });
    document.addEventListener("keydown", preventInteraction, true);
    document.body.append(shield);

    return () => {
      shield.remove();
      document.removeEventListener("keydown", preventInteraction, true);
    };
  }

  async function runCardTransition(update: () => void, changingSongKeys: string[]) {
    const before = visibleCardRects();
    const oldCopies = new Map(changingSongKeys.flatMap((songKey) => {
      const card = before.get(songKey)?.element;
      return card?.dataset.songExpanded === "true"
        ? [[songKey, card.cloneNode(true) as HTMLElement] as const]
        : [];
    }));

    flushSync(update);

    const after = visibleCardRects();
    const animations: Animation[] = [];
    const hiddenCards: HTMLElement[] = [];
    const copies: HTMLElement[] = [];
    const unlockPageInteraction = lockPageInteraction();

    after.forEach(({ element, rect }, songKey) => {
      const previous = before.get(songKey);
      if (!previous || changingSongKeys.includes(songKey)) return;

      const x = previous.rect.left - rect.left;
      const y = previous.rect.top - rect.top;
      if (x === 0 && y === 0) return;

      animations.push(element.animate(
        [{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
        { duration: 480, easing: "ease-in-out" },
      ));
    });

    changingSongKeys.forEach((songKey, index) => {
      const previous = before.get(songKey);
      const next = after.get(songKey);
      if (!previous || !next) return;

      const copy = oldCopies.get(songKey) ?? next.element.cloneNode(true) as HTMLElement;
      Object.assign(copy.style, {
        position: "fixed",
        top: `${previous.rect.top}px`,
        left: `${previous.rect.left}px`,
        width: `${previous.rect.width}px`,
        height: `${previous.rect.height}px`,
        margin: "0",
        pointerEvents: "none",
        zIndex: `${1000 + index}`,
      });
      copy.setAttribute("aria-hidden", "true");
      document.body.append(copy);
      copies.push(copy);

      next.element.style.visibility = "hidden";
      hiddenCards.push(next.element);
      animations.push(copy.animate(
        [
          {
            top: `${previous.rect.top}px`,
            left: `${previous.rect.left}px`,
            width: `${previous.rect.width}px`,
            height: `${previous.rect.height}px`,
          },
          {
            top: `${next.rect.top}px`,
            left: `${next.rect.left}px`,
            width: `${next.rect.width}px`,
            height: `${next.rect.height}px`,
          },
        ],
        { duration: 480, easing: "ease-in-out", fill: "forwards" },
      ));
    });

    try {
      await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
    } finally {
      copies.forEach((copy) => copy.remove());
      hiddenCards.forEach((card) => card.style.removeProperty("visibility"));
      unlockPageInteraction();
    }
  }

  async function selectSong(songKey: string) {
    if (isChangingSelection.current) return;
    isChangingSelection.current = true;

    try {
      if (expandedSongKey === songKey) {
        await runCardTransition(() => setExpandedSongKey(null), [songKey]);
        return;
      }

      const changingSongKeys = expandedSongKey ? [expandedSongKey, songKey] : [songKey];
      await runCardTransition(() => setExpandedSongKey(songKey), changingSongKeys);
    } finally {
      isChangingSelection.current = false;
    }
  }

  return (
    <div>
      <PageHeading
        title="All records"
        description="Browse every recorded song. Open a jacket to view its charts, then select a difficulty for its complete score history. DX and STD versions can be toggled on the same card."
      />

      <label className="mt-10 block max-w-lg">
        <span className="sr-only">Search by song title</span>
        <input type="search" value={query} onChange={(event) => handleSearch(event.target.value)} placeholder="Search by song title…" className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-lightest/70 focus:border-coral focus:ring-3 focus:ring-coral/10" />
      </label>

      <div className="mt-8 grid grid-cols-[repeat(2,minmax(0,150px))] items-start justify-between gap-y-3 min-[528px]:grid-cols-[repeat(3,minmax(0,150px))] min-[528px]:gap-y-4 min-[688px]:grid-cols-[repeat(4,minmax(0,150px))] min-[848px]:grid-cols-[repeat(5,minmax(0,150px))] min-[1024px]:grid-cols-[repeat(6,minmax(0,150px))]" onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('a[href*="/charts/"]')) preserveListPosition();
        }}>
          {arrangedSongs.map((song) => {
            const songKey = song.titles.canonical;
            return <SongInfo
              key={songKey}
              {...song}
              expanded={expandedSongKey === songKey}
              onToggle={() => void selectSong(songKey)}
            />;
          })}
          {!songs.length && <p className="col-span-full rounded-2xl border border-line p-10 text-center text-lightest">No matching songs.</p>}
          {songs.length > 0 && (
            <div ref={loadMoreRef} className="col-span-full py-4 text-center">
              <p className="mb-3 text-lightest">
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
