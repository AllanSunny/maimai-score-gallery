export function displayedChartLevel(level: string, chartConstant: number | null): string {
  return chartConstant == null ? level : chartConstant.toFixed(1);
}
