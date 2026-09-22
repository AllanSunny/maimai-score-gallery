import type { CSSProperties } from "react";
import type { ScoreHistoryTransitionTiming } from "../../hooks/useExpandableScoreHistory";
import { classNames } from "../../utils/class-names";
import type { ScoreRecord } from "../../utils/types";
import { ComboDisplay } from "./ComboDisplay";
import { JudgmentBreakdownTable } from "./JudgmentBreakdownTable";
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
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-light">Combo</dt>
              <dd className="mt-1 min-h-6 text-lightest">
                <ComboDisplay
                  className="h-6 max-w-full object-contain object-left"
                  status={score.combo}
                  size="large"
                />
                {score.combo === null && "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-light">Sync</dt>
              <dd className="mt-1 min-h-6 text-lightest">
                <SyncDisplay
                  className="h-6 max-w-full object-contain object-left"
                  status={score.sync}
                  size="large"
                />
                {score.sync == null && "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-light">Rating</dt>
              <dd className="mt-1 tabular-nums text-lightest">{score.rating}</dd>
            </div>
            <div>
              <dt className="text-xs text-light">Rating change</dt>
              <dd className="mt-1 tabular-nums text-lightest">
                {score.ratingChange > 0 ? "+" : ""}
                {score.ratingChange}
              </dd>
            </div>
          </dl>

          <section className="mt-5 border-t border-lightest pt-5" aria-label="Judgment counts">
            <JudgmentBreakdownTable
              judgments={score.judgments}
              judgmentsByType={score.judgmentsByType}
            />
          </section>

          {(score.fast != null || score.slow != null) && (
            <dl className="mt-5 flex gap-8 border-t border-lightest pt-5">
              <div>
                <dt className="text-xs text-light">Fast</dt>
                <dd className="mt-1 tabular-nums text-lightest">{score.fast ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-light">Slow</dt>
                <dd className="mt-1 tabular-nums text-lightest">{score.slow ?? "—"}</dd>
              </div>
            </dl>
          )}

        </div>
      </div>
    </div>
  );
}
