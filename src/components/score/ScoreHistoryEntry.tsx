import { useEffect, useRef } from "react";
import { formatEasternDate, formatEasternTime } from "../../utils/date-time";
import type { JudgmentSet, ScoreRecord } from "../../utils/types";
import { ComboDisplay } from "./ComboDisplay";
import { MiniScoreBreakdown } from "./MiniScoreBreakdown";
import { SyncDisplay } from "./SyncDisplay";
import { ChevronIcon } from "../ui/ChevronIcon";

interface ScoreHistoryEntryProps {
  score: ScoreRecord;
  accentColor: string;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

const judgmentLabels: Array<[keyof JudgmentSet, string]> = [
  ["criticalPerfect", "Critical Perfect"],
  ["perfect", "Perfect"],
  ["great", "Great"],
  ["good", "Good"],
  ["miss", "Miss"],
];

function JudgmentValues({ judgments }: { judgments: JudgmentSet }) {
  return judgmentLabels.map(([key, label]) => (
    <div key={key}>
      <dt className="text-xs text-light">{label}</dt>
      <dd className="mt-1 tabular-nums text-lightest">{judgments[key] ?? "—"}</dd>
    </div>
  ));
}

export function ScoreHistoryEntry({ score, accentColor, isOpen, onToggle }: ScoreHistoryEntryProps) {
  const entryRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (isOpen) entryRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen]);

  return (
    <details
      ref={entryRef}
      id={score.id}
      open={isOpen}
      className="group border-b last:border-b-0"
      style={{ borderColor: `var(--color-${accentColor})` }}
      onToggle={(event) => {
        const nextIsOpen = event.currentTarget.open;
        if (nextIsOpen !== isOpen) onToggle(nextIsOpen);
      }}
    >
      <summary className="flex cursor-pointer touch-manipulation list-none items-center justify-between gap-8 p-3 sm:p-5 text-sm [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <ChevronIcon direction={isOpen ? "down" : "right"} className="text-primary" />
          <time className=" text-lightest" dateTime={score.playedAt}>
            <span className="text-xs md:text-sm whitespace-nowrap">{formatEasternDate(score.playedAt)}</span>{", "}
            <span className="text-xs md:text-sm whitespace-nowrap">{formatEasternTime(score.playedAt)}</span>
          </time>
        </div>
        <MiniScoreBreakdown achievement={score.achievement} combo={score.combo} sync={score.sync} />
      </summary>

      <div className="border-t px-5 py-5 text-sm" style={{ borderColor: `var(--color-${accentColor})` }}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><dt className="text-xs text-light">Combo</dt><dd className="mt-1 min-h-6 text-lightest"><ComboDisplay className="h-6 max-w-full object-contain object-left" status={score.combo} size="large" />{score.combo === null && "—"}</dd></div>
          <div><dt className="text-xs text-light">Sync</dt><dd className="mt-1 min-h-6 text-lightest"><SyncDisplay className="h-6 max-w-full object-contain object-left" status={score.sync} size="large" />{score.sync == null && "—"}</dd></div>
          <div><dt className="text-xs text-light">Rating</dt><dd className="mt-1 tabular-nums text-lightest">{score.rating}</dd></div>
          <div><dt className="text-xs text-light">Rating change</dt><dd className="mt-1 tabular-nums text-lightest">{score.ratingChange > 0 ? "+" : ""}{score.ratingChange}</dd></div>
        </dl>

        {score.judgments && (
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-5" style={{ borderColor: `var(--color-${accentColor})` }}>
            <JudgmentValues judgments={score.judgments} />
          </dl>
        )}

        {(score.fast != null || score.slow != null) && (
          <dl className="mt-5 flex gap-8 border-t pt-5" style={{ borderColor: `var(--color-${accentColor})` }}>
            <div><dt className="text-xs text-light">Fast</dt><dd className="mt-1 tabular-nums text-lightest">{score.fast ?? "—"}</dd></div>
            <div><dt className="text-xs text-light">Slow</dt><dd className="mt-1 tabular-nums text-lightest">{score.slow ?? "—"}</dd></div>
          </dl>
        )}

        {!score.judgments && score.fast == null && score.slow == null && (
          <p className="mt-5 border-t pt-5 text-light" style={{ borderColor: `var(--color-${accentColor})` }}>
            Judgment details are unavailable for this play.
          </p>
        )}
      </div>
    </details>
  );
}
