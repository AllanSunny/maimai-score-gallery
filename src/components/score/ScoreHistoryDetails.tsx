import type { CSSProperties } from "react";
import type { ScoreHistoryTransitionTiming } from "../../hooks/useExpandableScoreHistory";
import { classNames } from "../../utils/class-names";
import type { ScoreRecord } from "../../utils/types";
import { ComboDisplay } from "./ComboDisplay";
import { JudgmentBreakdownTable } from "./JudgmentBreakdownTable";
import { RatingDisplay } from "./RatingDisplay";
import { SyncDisplay } from "./SyncDisplay";

interface ScoreHistoryDetailsProps {
  accentColor: string;
  isExpanded: boolean;
  score: ScoreRecord;
  transitionTiming: ScoreHistoryTransitionTiming;
}

export function ScoreHistoryDetails({
  accentColor,
  isExpanded,
  score,
  transitionTiming,
}: ScoreHistoryDetailsProps) {
  const transitionStyle = {
    transitionDuration: `${transitionTiming.duration}ms`,
    transitionTimingFunction: transitionTiming.easing,
  } satisfies CSSProperties;

  return (
    <div
      data-score-details
      className={classNames(
        "grid transition-[grid-template-rows]",
        { when: isExpanded, then: "grid-rows-[1fr]", else: "grid-rows-[0fr]" },
      )}
      style={transitionStyle}
      aria-hidden={!isExpanded}
      inert={!isExpanded}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className="bg-darker/90 p-4 sm:p-5 text-sm"
          style={{
            borderColor: isExpanded
              ? "var(--color-lightest)"
              : `var(--color-${accentColor})`,
          }}
        >
          <div className="flex flex-wrap justify-center gap-x-14">
            <section className="w-fit self-center" aria-label="Judgment counts">
              <JudgmentBreakdownTable
                judgments={score.judgments}
                judgmentsByType={score.judgmentsByType}
              />
            </section>

            <div className="flex flex-col items-center gap-3 md:gap-6 mt-5">
              <div className="flex flex-wrap gap-12 text-lightest">
                <ComboDisplay
                  className="h-8 sm:h-9 max-w-full object-contain object-left"
                  status={score.combo}
                  size="large"
                />
                <SyncDisplay
                  className="h-8 sm:h-9 max-w-full object-contain object-left"
                  status={score.sync}
                  size="large"
                />
              </div>

              <div className="flex items-center gap-4 tabular-nums text-lightest">
                <RatingDisplay rating={score.rating} className={"w-40 sm:w-48"} />
                {score.ratingChange > 0 && (
                  <span
                    className="text-lightest text-base sm:text-lg font-bold"
                    aria-label={`Rating change +${score.ratingChange}`}
                  >
                    {`+${score.ratingChange}`}
                  </span>
                )}
              </div>

              {(score.fast != null || score.slow != null) && (
                <dl className="flex gap-12">
                  <div>
                    <dt className="text-xs sm:text-sm text-light">Fast</dt>
                    <dd className="mt-1 text-sm sm:text-base tabular-nums text-lightest">{score.fast ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-light">Slow</dt>
                    <dd className="mt-1 text-sm sm:text-base tabular-nums text-lightest">{score.slow ?? "—"}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
