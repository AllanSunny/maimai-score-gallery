import type { CSSProperties } from "react";
import type { ScoreHistoryTransitionTiming } from "../../hooks/useExpandableScoreHistory";
import { classNames } from "../../utils/class-names";
import { formatEasternDate, formatEasternTime } from "../../utils/date-time";
import type { JudgmentSet, ScoreRecord } from "../../utils/types";
import { ChevronIcon } from "../ui/ChevronIcon";
import { ComboDisplay } from "./ComboDisplay";
import { MiniScoreBreakdown } from "./MiniScoreBreakdown";
import { SyncDisplay } from "./SyncDisplay";

interface ScoreHistoryEntryProps {
  score: ScoreRecord;
  accentColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  transitionTiming: ScoreHistoryTransitionTiming;
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
            className="border-t px-5 py-5 text-sm"
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

            {score.judgments && (
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-lightest pt-5 sm:grid-cols-5">
                <JudgmentValues judgments={score.judgments} />
              </dl>
            )}

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

            {!score.judgments && score.fast == null && score.slow == null && (
              <p className="mt-5 border-t border-lightest pt-5 text-light">
                Judgment details are unavailable for this play.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
