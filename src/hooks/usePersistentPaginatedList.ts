import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

interface StoredListState {
  visibleCount: number;
  scrollY: number;
}

interface PersistentPaginatedListOptions<T> {
  items: T[];
  matchesQuery: (item: T, normalizedQuery: string) => boolean;
  pageSize: number;
  query: string;
  storageKey: string;
}

function readListState(storageKey: string, pageSize: number): StoredListState {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    return {
      visibleCount: typeof value?.visibleCount === "number"
        ? Math.max(pageSize, value.visibleCount)
        : pageSize,
      scrollY: typeof value?.scrollY === "number" ? value.scrollY : 0,
    };
  } catch {
    return { visibleCount: pageSize, scrollY: 0 };
  }
}

export function usePersistentPaginatedList<T>({
  items,
  matchesQuery,
  pageSize,
  query,
  storageKey,
}: PersistentPaginatedListOptions<T>) {
  const [initialState] = useState(() => readListState(storageKey, pageSize));
  const [visibleCount, setVisibleCount] = useState(initialState.visibleCount);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return items.filter((item) => matchesQuery(item, normalizedQuery));
  }, [items, matchesQuery, query]);
  const itemCount = filteredItems.length;
  const hasMoreItems = visibleCount < itemCount;

  useEffect(() => {
    const marker = loadMoreRef.current;
    if (!marker || !hasMoreItems) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + pageSize, itemCount));
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasMoreItems, itemCount, pageSize, visibleCount]);

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
  }, [initialState.scrollY, visibleCount]);

  function resetVisibleCount() {
    setVisibleCount(pageSize);
  }

  function loadMore() {
    setVisibleCount((count) => Math.min(count + pageSize, itemCount));
  }

  function preservePosition() {
    sessionStorage.setItem(storageKey, JSON.stringify({
      visibleCount,
      scrollY: window.scrollY,
    } satisfies StoredListState));
  }

  return {
    filteredItems,
    visibleCount,
    loadMoreRef,
    hasMoreItems,
    resetVisibleCount,
    loadMore,
    preservePosition,
  };
}
