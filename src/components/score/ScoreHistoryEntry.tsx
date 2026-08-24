import { formatEasternDateTime } from "../../utils/date-time";
import { achievementRank } from "../../utils/rank";
import type { JudgmentSet, ScoreRecord } from "../../utils/types";
import { ComboDisplay } from "./ComboDisplay";
import { SyncDisplay } from "./SyncDisplay";

interface ScoreHistoryEntryProps {
  score: ScoreRecord;
  accentColor: string;
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

export function ScoreHistoryEntry({ score, accentColor }: ScoreHistoryEntryProps) {
  return (
    <details
      className="group border-b last:border-b-0"
      style={{ borderColor: `var(--color-${accentColor})` }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="text-light transition-transform group-open:rotate-90">›</span>
          <time className="text-lightest">{formatEasternDateTime(score.playedAt)}</time>
        </div>
        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums">{score.achievement.toFixed(4)}%</span>
          <span className="mt-1 block text-xs font-semibold text-lightest">{achievementRank(score.achievement)}</span>
        </span>
      </summary>

      <div className="border-t px-5 py-5 text-sm" style={{ borderColor: `var(--color-${accentColor})` }}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><dt className="text-xs text-light">Combo</dt><dd className="mt-1 min-h-6 text-lightest"><ComboDisplay className="h-6 max-w-full object-contain object-left" status={score.combo} size="large" />{score.combo === "Clear" && "Clear"}</dd></div>
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
          <p className="mt-5 border-t pt-5 text-xs text-light" style={{ borderColor: `var(--color-${accentColor})` }}>
            Judgment details are unavailable for this play.
          </p>
        )}
      </div>
    </details>
  );
}
