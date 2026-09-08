import type { SongSummary } from "../../utils/types";
import { ExpandedSongDetails } from "./ExpandedSongDetails";
import { SongJacket } from "./SongJacket";
import { classNames } from "../../utils/class-names";

const songClassNames = {
  collapsed: "bg-darker",
  expanded: "z-30 col-span-full bg-dark shadow-[0_0px_5px_var(--color-primary)] md:grid md:grid-cols-[15rem_minmax(0,1fr)]",
};

interface SongInfoProps extends SongSummary {
  expanded: boolean;
  onToggle: () => void;
}

export function SongInfo({ titles, jacketUrl, versions, expanded, onToggle }: SongInfoProps) {
  const name = titles.canonical;

  return (
    <article
      data-song-key={name}
      data-song-expanded={expanded}
      className={classNames(
        "group relative overflow-hidden rounded-xl border border-primary",
        { when: expanded, then: songClassNames.expanded, else: songClassNames.collapsed },
      )}
    >
      <div
        className={classNames({ when: expanded, then: "p-3 content-center md:py-0 md:pr-0" })}
        data-song-jacket-container
      >
        <SongJacket expanded={expanded} jacketUrl={jacketUrl} name={name} onToggle={onToggle} />
      </div>

      {expanded && <button
        type="button"
        data-song-dismiss
        aria-label={`Dismiss ${name} chart summaries`}
        onClick={onToggle}
        className="btn btn-tertiary absolute top-2 right-2 z-10 size-8 !rounded-full !p-0 text-lg leading-none backdrop-blur-sm"
      >
        <span aria-hidden="true">×</span>
      </button>}

      {expanded && <ExpandedSongDetails name={name} versions={versions} />}
    </article>
  );
}
