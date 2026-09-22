import closeIcon from "../../assets/icons/svg/close.svg";
import { classNames } from "../../utils/class-names";
import type { SongSummary } from "../../utils/types";
import { SvgIcon } from "../ui/SvgIcon";
import { ExpandedSongDetails } from "./ExpandedSongDetails";
import { SongGridJacket } from "./SongGridJacket";

const songClassNames = {
  collapsed: "bg-darker",
  expanded: "z-30 col-span-full bg-dark shadow-[0_0px_5px_var(--color-primary)] md:grid md:grid-cols-[16rem_minmax(0,1fr)]",
};

interface SongGridItemProps {
  song: SongSummary;
  expanded: boolean;
  onToggle: () => void;
}

export function SongGridItem({ song, expanded, onToggle }: SongGridItemProps) {
  const name = song.titles.canonical;

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
        <SongGridJacket expanded={expanded} song={song} onToggle={onToggle} />
      </div>

      {expanded && <button
        type="button"
        data-song-dismiss
        aria-label={`Dismiss ${name} chart summaries`}
        onClick={onToggle}
        className="btn btn-tertiary absolute top-2 right-2 z-10 size-8 !rounded-full !p-0 text-lg leading-none backdrop-blur-sm"
      >
        <SvgIcon icon={closeIcon} className="size-4" />
      </button>}

      {expanded && <ExpandedSongDetails name={name} versions={song.versions} />}
    </article>
  );
}
