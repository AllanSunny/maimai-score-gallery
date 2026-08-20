# Data model

This is the central reference for data stored by the score gallery. The
corresponding compile-time definitions live in `src/utils/types.ts`.

```mermaid
flowchart LR
  Sheet[Google Sheet] --> ScoreArchive[Monthly score archives]
  ScoreArchive -->|chartId| Charts
  Catalog[generated-catalog.json] --> Song
  Song --> Version[Song version: DX or STD]
  Version --> Charts[Difficulty charts]
  Version --> Jacket[R2 jacketKey]
```

## Score archive

`src/data/scores/YYYY-MM.json` files form the public score archive. Plays are
partitioned by the UTC month of `playedAt`; an unchanged month is not rewritten.

`src/data/scores/chart-summaries.json` contains the lightweight cumulative
records used for song-list filtering and sorting. Its achievement, combo, and
sync bests are selected independently and point back to their source plays.
The normal import pipeline regenerates it once, after catalog synchronization
has assigned final chart IDs. Maintenance workflows that edit archived scores
without running catalog synchronization invoke `npm run scores:summarize`.

```ts
interface ScoreChunk {
  period: string; // UTC YYYY-MM, matching the filename
  scores: ScoreRecord[];
}

interface ChartRecordSummary {
  playCount: number;
  bestAchievement: { value: number; scoreId: string; playedAt: string };
  bestCombo: { status: string; scoreId: string; playedAt: string };
  bestSync: {
    status: "Sync" | "FS" | "FS+" | "FDX" | "FDX+";
    scoreId: string;
    playedAt: string;
  } | null;
  historyChunks: string[]; // UTC YYYY-MM files containing this chart's plays
}

interface ScoreRecord {
  id: string;                  // Stable play identifier
  chartId: string;             // Stable Chart ID assigned before commit
  playedAt: string;            // ISO 8601 capture time
  songTitle: string;           // Title reported by OCR / spreadsheet
  chartType: "DX" | "STD";
  difficulty: "BASIC" | "ADVANCED" | "EXPERT" | "MASTER" | "Re:MASTER";
  level: string;               // Display level, e.g. "13+"
  chartConstant?: number;
  achievement: number;         // Percentage on a 0–101 scale
  combo: string;
  sync: "Sync" | "FS" | "FS+" | "FDX" | "FDX+" | null;
  rating: number;
  ratingChange: number;
  fast: number | null;         // null when timing counts are unavailable
  slow: number | null;
  judgments: JudgmentSet | null; // null when no overall counts are known
  judgmentsByType: JudgmentBreakdown | null;
}

interface JudgmentSet {
  criticalPerfect: number | null;
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

interface JudgmentBreakdown {
  break: JudgmentSet;
  tap: JudgmentSet;
  hold: JudgmentSet;
  slide: JudgmentSet;
  touch: JudgmentSet;
}
```

`criticalPerfect: null` means that the value was not separately displayed or
could not be read. Older result layouts combine CRITICAL PERFECT and PERFECT
for TAP, HOLD, SLIDE, and TOUCH, so those legacy note types retain the combined
count in `perfect` and store `criticalPerfect: null`. BREAK continues to store
its separately displayed critical-perfect count. A numeric zero is reserved
for a count that was actually shown as zero.

Rank is derived in the frontend from `achievement`; it is not stored on each score record.

Notes/Location is intentionally excluded from the public archive.

## Song catalog

`src/data/generated-catalog.json` stores normalized song metadata. Each song
owns one or more DX/STD versions, and each version owns its difficulty charts.

```ts
interface GeneratedCatalog {
  generatedAt: string;
  songs: Song[];
}

interface Song {
  id: string;                   // e.g. "magical-flavor"
  titles: SongTitles;
  artist: string;               // Artist credit from the SEGA catalog
  genre: string;                // SEGA catcode, e.g. "maimai"
  introducedIn: MaimaiVersion | null;
  jacketKey: string | null;     // R2 object key, never credentials or a full URL
  versions: SongVersion[];
}

interface MaimaiVersion {
  code: string | null;          // Raw SEGA value, or null for a named standalone release
  name: string;                 // Release family, e.g. "BUDDiES"
}

interface SongTitles {
  canonical: string;
  kana: string[];
  romaji: string[];
  english: string[];
  aliases: string[];
}

interface SongVersion {
  id: string;                   // e.g. "magical-flavor-dx"
  chartType: "DX" | "STD";
  charts: Chart[];
}

interface Chart {
  id: string;                   // e.g. "magical-flavor-dx-master"
  difficulty: "BASIC" | "ADVANCED" | "EXPERT" | "MASTER" | "Re:MASTER";
  level: string;
  chartConstant: number | null;
}
```

`introducedIn` deliberately differs from `versions`: `introducedIn` is the
named game release in which SEGA associates the song, while `versions` contains
the song's playable DX/STD chart variants. The numeric code is retained because
its trailing digits identify SEGA content batches within a release family.

The importer maps the observed SEGA ranges as follows:

| Codes | Release | Codes | Release |
| --- | --- | --- | --- |
| 10000–10999 | maimai | 11000–11999 | maimai PLUS |
| 12000–12999 | GreeN | 13000–13999 | GreeN PLUS |
| 14000–14999 | ORANGE | 15000–15999 | ORANGE PLUS |
| 16000–16999 | PiNK | 17000–17999 | PiNK PLUS |
| 18000–18499 | MURASAKi | 18500–18999 | MURASAKi PLUS |
| 19000–19499 | MiLK | 19500–19899 | MiLK PLUS |
| 19900–19999 | FiNALE | 20000–20499 | maimai でらっくす |
| 20500–20999 | maimai でらっくす PLUS | 21000–21499 | Splash |
| 21500–21999 | Splash PLUS | 22000–22499 | UNiVERSE |
| 22500–22999 | UNiVERSE PLUS | 23000–23499 | FESTiVAL |
| 23500–23999 | FESTiVAL PLUS | 24000–24499 | BUDDiES |
| 24500–24999 | BUDDiES PLUS | 25000–25499 | PRiSM |
| 25500–25999 | PRiSM PLUS | 26000–26499 | CiRCLE |
| 26500–26999 | CiRCLE PLUS | | |

The ranges are derived by correlating the numeric `version` values in
[SEGA's public song catalog](https://maimai.sega.jp/data/maimai_songs.json)
with the documented chronological [maimai release list](https://en.wikipedia.org/wiki/Maimai_(video_game_series)#Versions).
An unknown future range fails validation so it cannot be silently assigned to
the wrong release. A standalone override can provide a verified release name
with `code: null` when its exact historical SEGA batch code is unavailable.

The browser derives `jacketUrl` at build time from `VITE_JACKET_BASE_URL` and
the stored `jacketKey`. It is not part of the persisted catalog schema.

## Rejected song names

Scores whose song titles remain unmatched are quarantined before commit. The
metadata workflow uploads `.sync/rejected-scores.json` as a temporary GitHub
Actions artifact containing the rejected title and affected score IDs/times.
They are not stored in either generated data file. Correct the spreadsheet title
or add an override, then rerun the score archive workflow to retry them.

## Matching and identity rules

- Every committed score references a stable `Chart.id`; title/type/difficulty
  remain as readable source data.
- Song-version IDs end in `-dx` or `-std`.
- Chart IDs append the normalized difficulty to the song-version ID.
- DX and STD versions share their parent song's immutable `jacketKey`.
- Search titles exist only in `Song.titles`, never on score records.
- Kana, romaji, English titles, and aliases are trimmed and normalized to
  lowercase during catalog import.
- `chartConstant: null` means the source has no constant and no override exists.

## Enforcement

`src/utils/data-validation.ts` validates the generated catalog and every monthly score file at runtime. The
same validation runs in catalog synchronization and GitHub Pages deployment
through `npm run data:validate`; invalid data stops the workflow before commit
or deployment.
