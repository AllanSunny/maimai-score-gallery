import { OverflowMarquee } from "../ui/OverflowMarquee";
import { fallbackImage, handleImageError } from "../../utils/fallback-image";

interface SongJacketProps {
  expanded: boolean;
  jacketUrl?: string | null;
  name: string;
  onToggle: () => void;
}

export function SongJacket({ expanded, jacketUrl, name, onToggle }: SongJacketProps) {
  return (
    <button
      type="button"
      disabled={expanded}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Close" : "Open"} ${name} chart summaries`}
      onClick={onToggle}
      className={`relative block w-full overflow-hidden rounded-xl bg-darkest text-left ${expanded ? "mx-auto mt-1 !h-[180px] !w-[180px] aspect-square max-h-60 max-w-60 border border-lightest cursor-default md:mt-0 md:!h-full md:!w-full md:aspect-auto md:self-center" : "aspect-square cursor-pointer"}`}
      data-song-jacket
    >
      <img
        src={jacketUrl ?? fallbackImage}
        alt=""
        width="240"
        height="240"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleImageError}
        className={`size-full object-cover ${expanded ? "" : "transition duration-300 group-hover:scale-[1.1] group-focus-within:scale-[1.1]"}`}
      />
      <span className={`absolute inset-x-0 bottom-0 translate-y-full bg-dark/80 px-3 py-2 text-lightest backdrop-blur-sm ${expanded ? "" : "transition-transform duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0"}`}>
        <OverflowMarquee className="font-semibold" centerWhenFit>{name}</OverflowMarquee>
      </span>
    </button>
  );
}
