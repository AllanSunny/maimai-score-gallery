import { classNames } from "../../utils/class-names";
import type { JudgmentBreakdown, JudgmentSet } from "../../utils/types";
import { NoteImageDisplay, type NoteType } from "../ui/NoteImageDisplay";

interface JudgmentBreakdownTableProps {
  judgments: JudgmentSet | null;
  judgmentsByType: JudgmentBreakdown | null;
}

interface JudgmentTableRow {
  label: string;
  noteType?: NoteType;
  values: JudgmentSet;
}

const judgmentColumns: Array<{
  key: keyof JudgmentSet;
  label: string;
  className: string;
}> = [
  {
    key: "criticalPerfect",
    label: "Critical Perfect",
    className: "bg-advanced/30 text-advanced",
  },
  { key: "perfect", label: "Perfect", className: "bg-advanced/17 text-advanced" },
  { key: "great", label: "Great", className: "bg-expert/20 text-expert" },
  { key: "good", label: "Good", className: "bg-basic/20 text-basic" },
  { key: "miss", label: "Miss", className: "bg-light/17 text-lightest/60" },
];

const judgmentRows: Array<{ key: keyof JudgmentBreakdown; label: string; noteType: NoteType }> = [
  { key: "tap", label: "Tap", noteType: "tap" },
  { key: "hold", label: "Hold", noteType: "hold" },
  { key: "slide", label: "Slide", noteType: "slide" },
  { key: "touch", label: "Touch", noteType: "touch" },
  { key: "break", label: "Break", noteType: "break" },
];

function hasJudgmentValues(judgments: JudgmentSet) {
  return Object.values(judgments).some((value) => value != null);
}

export function JudgmentBreakdownTable({
  judgments,
  judgmentsByType,
}: JudgmentBreakdownTableProps) {
  if (!judgments || !hasJudgmentValues(judgments)) {
    return <p className="text-light">Judgement counts unavailable for this play.</p>;
  }

  const rows: JudgmentTableRow[] = [
    ...(judgmentsByType
      ? judgmentRows.map(({ key, label, noteType }) => ({ label, noteType, values: judgmentsByType[key] }))
      : []),
    { label: "Total", values: judgments },
  ].filter(({ values }) => hasJudgmentValues(values));

  return (
    <div>
      <div className="w-fit overflow-hidden rounded-lg border border-primary">
        <table className="w-full max-w-[34rem] table-fixed border-collapse bg-darkest text-center text-[10px] sm:text-sm">
          <thead className="text-light">
            <tr>
              <th scope="col" className="border-r border-lightest/20 py-2 font-normal sm:px-1">
                Type
              </th>
              {judgmentColumns.map(({ key, label }) => (
                <th key={key} scope="col" className="border-r border-lightest/20 py-2 font-normal last:border-r-0 sm:px-1">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, noteType, values }) => {
              const topBorderClassName = label === "Total" ? "border-t-2" : "border-t";

              return (
                <tr key={label}>
                  <th
                    scope="row"
                    aria-label={label}
                    className={classNames("border-r border-lightest/20 py-2 font-normal text-lightest sm:px-1", topBorderClassName)}
                  >
                    {noteType
                      ? <NoteImageDisplay
                          noteType={noteType}
                          className={classNames("mx-auto h-6 sm:h-8", {
                            when: noteType === "hold",
                            then: "rotate-90",
                          })}
                        />
                      : label}
                  </th>
                  {judgmentColumns.map(({ key, className }) => (
                    <td key={key} className={classNames("border-r border-lightest/20 py-2 text-xs sm:text-sm tabular-nums last:border-r-0 sm:px-1", topBorderClassName, className)}>
                      {values[key] ?? "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
