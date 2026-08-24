import type { ScoreRecord } from "../../utils/types";
import { ContentCard } from "../ui/ContentCard";
import { ScoreHistoryEntry } from "./ScoreHistoryEntry";

interface ScoreHistoryProps {
  scores: ScoreRecord[];
  accentColor: string;
}

export function ScoreHistory({ scores, accentColor }: ScoreHistoryProps) {
  return (
    <ContentCard accentColor={accentColor} variant="secondary" className="mt-5">
      {scores.map((score) => (
        <ScoreHistoryEntry key={score.id} score={score} accentColor={accentColor} />
      ))}
      {!scores.length && <p className="p-10 text-center text-sm text-lightest">No plays recorded for this chart yet.</p>}
    </ContentCard>
  );
}
