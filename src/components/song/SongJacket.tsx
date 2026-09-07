import { OverflowMarquee } from "../ui/OverflowMarquee";
import favicon from "../../assets/favicon.png";
import { useFallbackImage } from "../../hooks/useFallbackImage";

interface SongJacketProps {
  expanded: boolean;
  jacketUrl?: string | null;
  name: string;
  onToggle: () => void;
}

export function SongJacket({ expanded, jacketUrl, name, onToggle }: SongJacketProps) {
  const handleImageError = useFallbackImage(favicon);

  return (
    <button
      type="button"
      disabled={expanded}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Close" : "Open"} ${name} chart summaries`}
      onClick={onToggle}
      className={`relative block w-full overflow-hidden rounded-xl bg-darkest text-left ${expanded ? "mx-auto my-4 !h-[180px] !w-[180px] aspect-square max-h-60 max-w-60 border border-lightest cursor-default md:my-0 md:!h-full md:!w-full md:aspect-auto md:self-center" : "aspect-square cursor-pointer"}`}
      data-song-jacket
    >
      <img
        src={jacketUrl ?? favicon}
        alt=""
        width="240"
        height="240"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleImageError}
        className={`size-full object-cover ${expanded ? "" : "transition duration-300 group-hover:scale-[1.025] group-focus-within:scale-[1.025]"}`}
      />
      <span className={`absolute inset-x-0 bottom-0 translate-y-full bg-darkest/90 px-3 py-2 text-lightest backdrop-blur-sm ${expanded ? "" : "transition-transform duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0"}`}>
        <OverflowMarquee className="font-semibold" centerWhenFit>{name}</OverflowMarquee>
      </span>
    </button>
  );
}
