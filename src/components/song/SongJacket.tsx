import { OverflowMarquee } from "../ui/OverflowMarquee";
import { classNames } from "../../utils/class-names";
import type { SongSummary } from "../../utils/types";
import { SongJacketImage } from "./SongJacketImage";

const jacketClassNames = {
  collapsed: "aspect-square cursor-pointer",
  expanded: "mx-auto mt-1 !h-[180px] !w-[180px] aspect-square max-h-60 max-w-60 border border-lightest cursor-default md:mt-0 md:!h-full md:!w-full md:aspect-auto md:self-center",
};

interface SongJacketProps {
  expanded: boolean;
  song: SongSummary;
  onToggle: () => void;
}

export function SongJacket({ expanded, song, onToggle }: SongJacketProps) {
  const name = song.titles.canonical;

  return (
    <button
      type="button"
      disabled={expanded}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Close" : "Open"} ${name} chart summaries`}
      onClick={onToggle}
      className={classNames(
        "relative block w-full overflow-hidden rounded-xl bg-darkest text-left",
        { when: expanded, then: jacketClassNames.expanded, else: jacketClassNames.collapsed },
      )}
      data-song-jacket
    >
      <SongJacketImage
        song={song.catalogSong}
        width="240"
        height="240"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={classNames(
          "size-full object-cover",
          {
            when: !expanded,
            then: "transition duration-300 group-hover:scale-[1.1] group-focus-within:scale-[1.1]",
          },
        )}
      />
      <span
        className={classNames(
          "absolute inset-x-0 bottom-0 translate-y-full bg-dark/80 px-3 py-2 text-lightest backdrop-blur-sm",
          {
            when: !expanded,
            then: "transition-transform duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0",
          },
        )}
      >
        <OverflowMarquee className="font-semibold" centerWhenFit>{name}</OverflowMarquee>
      </span>
    </button>
  );
}
