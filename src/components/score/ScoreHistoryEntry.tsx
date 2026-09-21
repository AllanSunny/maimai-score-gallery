import type { CSSProperties } from "react";
import type { ScoreHistoryTransitionTiming } from "../../hooks/useExpandableScoreHistory";
import { classNames } from "../../utils/class-names";
import { formatEasternDate, formatEasternTime } from "../../utils/date-time";
import type { ScoreRecord } from "../../utils/types";
import { ChevronIcon } from "../ui/ChevronIcon";
import { MiniScoreBreakdown } from "./MiniScoreBreakdown";
import { ScoreHistoryDetails } from "./ScoreHistoryDetails";

interface ScoreHistoryEntryProps {
  score: ScoreRecord;
  accentColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  transitionTiming: ScoreHistoryTransitionTiming;
}

export function ScoreHistoryEntry({
  score,
  accentColor,
  isExpanded,
  onToggle,
  transitionTiming,
}: ScoreHistoryEntryProps) {
  const transitionStyle = {
    transitionDuration: `${transitionTiming.duration}ms`,
    transitionTimingFunction: transitionTiming.easing,
  } satisfies CSSProperties;

  return (
    <article
      id={score.id}
      data-score-id={score.id}
      data-score-expanded={isExpanded}
      className={classNames(
        "group scroll-mt-16 border-b transition-[background-color,box-shadow,border-color] last:border-b-0",
        {
          when: isExpanded,
          then: "overflow-hidden bg-dark/80 shadow-[0_-5px_5px_-5px_var(--color-lightest),0_5px_5px_-5px_var(--color-lightest)]",
        },
      )}
      style={{
        ...transitionStyle,
        borderColor: isExpanded
          ? "var(--color-lightest)"
          : `var(--color-${accentColor})`,
      }}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer touch-manipulation items-center justify-between gap-8 p-3 text-left sm:p-5"
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <div className="flex min-w-0 items-center gap-3">
          <ChevronIcon
            direction={isExpanded ? "down" : "right"}
            className="text-primary"
          />
          <time className="text-lightest" dateTime={score.playedAt}>
            <span className="whitespace-nowrap text-xs md:text-sm">
              {formatEasternDate(score.playedAt)}
            </span>
            {", "}
            <span className="whitespace-nowrap text-xs md:text-sm">
              {formatEasternTime(score.playedAt)}
            </span>
          </time>
        </div>
        <MiniScoreBreakdown
          achievement={score.achievement}
          combo={score.combo}
          sync={score.sync}
        />
      </button>

      <ScoreHistoryDetails
        accentColor={accentColor}
        isExpanded={isExpanded}
        score={score}
        transitionTiming={transitionTiming}
      />
    </article>
  );
}
