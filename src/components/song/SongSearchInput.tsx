import searchIcon from "../../assets/icons/search.svg";
import { classNames } from "../../utils/class-names";

const searchPlaceholder = "Search titles...";

interface SongSearchInputProps {
  query: string;
  onChange: (query: string) => void;
  onClear: () => void;
}

export function SongSearchInput({ query, onChange, onClear }: SongSearchInputProps) {
  return (
    <div className="min-w-0 flex-1 song-controls-wide:min-w-[330px] song-controls-wide:basis-[400px]">
      <label htmlFor="song-search" className="sr-only">Search by song title</label>
      <span className="relative block">
        <img src={searchIcon} alt="" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2" />
        <input
          id="song-search"
          type="search"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder={searchPlaceholder}
          className={classNames(
            "w-full rounded-xl border border-line bg-white/95 py-2 sm:py-2.5 pl-11 text-sm text-dark outline-none transition placeholder:text-darker/60 focus:border-dark focus:ring-3 focus:ring-dark/10 [&::-webkit-search-cancel-button]:appearance-none",
            { when: Boolean(query), then: "pr-8", else: "pr-2" },
          )}
        />
        {query && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-dark transition hover:bg-primary/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dark"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m6 6 12 12" />
              <path d="m18 6-12 12" />
            </svg>
          </button>
        )}
      </span>
    </div>
  );
}
