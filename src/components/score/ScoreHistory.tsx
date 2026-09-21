import { useExpandableScoreHistory } from "../../hooks/useExpandableScoreHistory";
import type { ScoreRecord } from "../../utils/types";
import { ContentCard } from "../ui/ContentCard";
import { EmptyState } from "../ui/EmptyState";
import { ScoreHistoryEntry } from "./ScoreHistoryEntry";

interface ScoreHistoryProps {
  scores: ScoreRecord[];
  accentColor: string;
  chartId: string;
  activeScoreId?: string;
}

export function ScoreHistory({
  scores,
  accentColor,
  chartId,
  activeScoreId,
}: ScoreHistoryProps) {
  const chartRoute = `/charts/${encodeURIComponent(chartId)}`;
  const { selectScore, transitionTiming } = useExpandableScoreHistory(
    chartRoute,
    activeScoreId,
  );

  return (
    <ContentCard accentColor={accentColor} variant="secondary" className="mt-5">
      {scores.map((score) => {
        const isExpanded = score.id === activeScoreId;

        return (
          <ScoreHistoryEntry
            key={score.id}
            score={score}
            accentColor={accentColor}
            isExpanded={isExpanded}
            onToggle={() => selectScore(score.id)}
            transitionTiming={transitionTiming}
          />
        );
      })}
      {!scores.length && <EmptyState>No plays recorded for this chart yet.</EmptyState>}
    </ContentCard>
  );
}
