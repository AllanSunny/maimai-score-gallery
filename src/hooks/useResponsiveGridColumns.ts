import { useEffect, useRef, useState } from "react";

function currentGridColumnCount(grid: HTMLElement | null, fallbackCount: number) {
  if (!grid) return fallbackCount;
  return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
}

export function useResponsiveGridColumns(fallbackCount = 1) {
  const [gridColumnCount, setGridColumnCount] = useState(fallbackCount);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridColumnCount = () =>
      setGridColumnCount(currentGridColumnCount(grid, fallbackCount));
    const observer = new ResizeObserver(updateGridColumnCount);
    updateGridColumnCount();
    observer.observe(grid);

    return () => observer.disconnect();
  }, [fallbackCount]);

  return { gridRef, gridColumnCount };
}
