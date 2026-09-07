import type { SongSummary } from "../../utils/types";
import { ExpandedSongDetails } from "./ExpandedSongDetails";
import { SongJacket } from "./SongJacket";

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
      className={`group relative overflow-hidden rounded-xl border border-primary ${expanded ? "z-30 p-3 col-span-full bg-dark shadow-[0_0px_5px_var(--color-primary)] md:grid md:grid-cols-[15rem_minmax(0,1fr)]" : "bg-darker"}`}
    >
      <SongJacket expanded={expanded} jacketUrl={jacketUrl} name={name} onToggle={onToggle} />

      {expanded && <button
        type="button"
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
