import type { ScoreRecord } from "../../utils/types";
import { ContentCard } from "../ui/ContentCard";
import { ScoreHistoryEntry } from "./ScoreHistoryEntry";
import { navigate } from "../../utils/navigation";

interface ScoreHistoryProps {
  scores: ScoreRecord[];
  accentColor: string;
  chartId: string;
  activeScoreId?: string;
}

export function ScoreHistory({ scores, accentColor, chartId, activeScoreId }: ScoreHistoryProps) {
  const chartRoute = `/charts/${encodeURIComponent(chartId)}`;

  return (
    <ContentCard accentColor={accentColor} variant="secondary" className="mt-5">
      {scores.map((score) => (
        <ScoreHistoryEntry
          key={score.id}
          score={score}
          accentColor={accentColor}
          isOpen={score.id === activeScoreId}
          onToggle={(isOpen) => {
            navigate(isOpen
              ? `${chartRoute}#${encodeURIComponent(score.id)}`
              : chartRoute, { replace: true });
          }}
        />
      ))}
      {!scores.length && <p className="p-10 text-center text-sm text-lightest">No plays recorded for this chart yet.</p>}
    </ContentCard>
  );
}
