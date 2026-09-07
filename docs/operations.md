# Operations

Reference for running the gallery locally, importing and correcting scores,
and configuring deployment. Run commands from the repository root. See the
[data model](data-model.md) for stored score and catalog structures.

## Local setup

Use Node.js 24.14.1 or later in the Node.js 24 release line.

```bash
npm ci
npm run dev
```

For live imports and synchronization, configure the external services first.
In Cloudflare, create an R2 API token with **Object Read & Write** access scoped
only to the jacket bucket. Copy `.env.example` to `.env.local` and provide the
account ID, R2 access-key pair, bucket name, Google API settings, OpenAI key,
and `VITE_JACKET_BASE_URL`. The jacket URL should match GitHub's
`R2_PUBLIC_URL` Actions variable. `.env.local` is ignored by Git. Set `GOOGLE_APPLICATION_CREDENTIALS` to the
absolute path of the service-account JSON outside the repository. Keep the
catalog endpoints, OCR model, and capture timezone aligned with the GitHub
Actions variables below.

```bash
npm run google:check
npm run scores:check
npm run scores:import -- --limit 1
npm run scores:sync
npm run catalog:sync
npm run scores:summarize
npm run data:validate
```

`scores:import` is a live import, not a dry run: it can call OpenAI and modify
Drive and Sheets. `scores:sync` adds new play identities and updates matching archived plays from
the sheet. It also collapses duplicate archived identities, but retains plays
absent from the sheet. Deleting a sheet row or changing timestamp, title, chart
type, difficulty, or achievement does not remove the old archived identity;
those corrections require reconciling the archive as well.
`catalog:sync` imports missing songs and jackets, refreshes supplemental chart
constants and charter names for existing charts, and links score chart IDs.
Run `scores:summarize` afterward to regenerate cumulative chart records, then
`data:validate` before committing. The Google check commands inspect access and
sheet structure without importing scores.

Without `--limit`, the image importer processes the full actionable image queue.
`SCORE_IMPORT_CONCURRENCY` defaults to 4; image downloads, conversion, and OCR
can run concurrently while Sheets operations are serialized. Set it to 1 for
serial image processing. `--limit 1` limits actionable images, but checked
image-free manual review rows are processed first and are not covered by that
limit.

## OCR storage and retries

Accepted scores are written as columns in the main score sheet configured by
`GOOGLE_SHEET_NAME`. The hidden `_ScoreImportLog` sheet separately tracks Drive
file identity, processing status, source hash, score fingerprint, destination
row, and successful structured OCR JSON with its model and prompt version.
The visible `Score Import Review` sheet holds errors, corrections, and the
`Retry` checkbox. These sheets have different roles; the public monthly archive
contains normalized scores, not the raw OCR cache or review queue.

On a retry, a complete manual correction can bypass OCR. Otherwise, the importer
reuses parseable cached OCR JSON when the image source hash and
`SCORE_OCR_PROMPT_VERSION` match. Populated correction cells are applied before
validation. Without a usable cache, the importer makes a new OCR request.
Checking `Retry` alone does not force another model call. Changing only
`OPENAI_OCR_MODEL` does not invalidate the cache; changing the prompt version
does. Cached OCR has no time-based expiry in the current implementation.

New images are also checked against capture timestamps, source hashes, and
normalized score identities to avoid duplicate score insertion and unnecessary
OCR. Duplicate images move to `GOOGLE_DUPLICATES_FOLDER_ID`; accepted images
are renamed and moved to `GOOGLE_PROCESSED_FOLDER_ID` after their score is saved.

Capture-time selection prefers embedded EXIF, then Drive image metadata, then
Drive `createdTime`. That last fallback is upload time, not necessarily play
time; correct it in the review sheet when needed. Timestamp duplicate checks
use only EXIF or Drive image metadata, never upload time.

The import log is durable recovery state. If a rejected image has no visible
review row because that write failed, the next run reconstructs the row from
the log with Retry unchecked. Do not erase log entries to force a retry.
Temporary Actions artifacts are reports, not the OCR cache.

## Failure correction

Titles that cannot be matched are excluded from the committed score archive and
reported through Discord. Correct image-import failures in the visible
`Score Import Review` sheet and check `Retry`, or add catalog corrections to
`src/data/overrides.json`, then rerun **Import New Scores**. Judgment correction
columns override only the populated overall or note-type counts; blank cells
continue using OCR. Unmatched names are retried and are never written to the
public catalog. Set Status to `Ignored` to leave an image out of the retry queue.
`Retry` is cleared when an attempt starts; check it again after another correction.
Use `None` in Corrected Sync Status to clear an OCR sync result; leaving the cell
blank retains the OCR value.

For an `imported-move-pending` report, the score was already saved but the Drive
move failed. Restore folder access and rerun the workflow so it can finish the
move. Inspect the image import report and the row's Error before changing data.
Catalog-stage rejected titles are listed in `.sync/rejected-scores.json` in the
`generated-data` artifact; correct the spreadsheet title or catalog override
and rerun the pipeline.

## Manual score entry

For an image-free entry in `Score Import Review`, leave Filename and Drive File
ID blank, set Status to `Review`, and fill in:

- Corrected Capture Time (UTC)
- Corrected Title
- Corrected Chart Type (`DX` or `STD`)
- Corrected Difficulty
- Corrected Achievement % (0–101)
- Corrected Rating (a non-negative integer)

Check `Retry` and rerun **Import New Scores**. The chart level is resolved from
the catalog. Corrected Artist can help resolve the title. A complete manual
entry also works on an existing image review row and bypasses OpenAI OCR.

Judgment totals and note-type counts can all be blank. If supplying totals
without a breakdown, fill Perfect, Great, Good, and Miss. If supplying a
note-type breakdown, fill those four counts for all five note types; missing
overall totals are derived from the breakdown. Critical Perfect can remain
blank when unavailable; it does not default to Perfect. Supplied totals must
agree with the breakdown.

Rating Change defaults to zero. Blank Fast and Slow remain unavailable (`null`).
Combo is derived from achievement and judgments; there is no combo correction
column. Corrected Sync Status accepts `None`, `Sync`, `FS`, `FS+`, `FDX`, or
`FDX+`; blank means no sync status for a manual entry. Full-sync statuses require
a derived full combo, so supply the judgment counts needed to establish it.

## Song overrides

Songs removed from SEGA's current catalog can be defined as standalone entries
in `src/data/overrides.json`. Standalone entries require an explicit stable ID,
artist, genre, and at least one chart level. Jacket, chart constant, and charter data
may be unavailable:

```json
{
  "Removed Song": {
    "standalone": true,
    "id": "removed-song",
    "artist": "Artist Name",
    "genre": "maimai",
    "version": { "code": null, "name": "BUDDiES" },
    "jacketKey": null,
    "titles": {
      "kana": [],
      "romaji": [],
      "english": [],
      "aliases": []
    },
    "charts": {
      "STD:MASTER": {
        "level": "13+",
        "chartConstant": null,
        "charter": null
      }
    }
  }
}
```

The score importer includes these entries during title validation, and catalog
sync generates the same song/version/chart structure used for SEGA-backed
songs. Use the song's actual genre and release in place of the example values.
`version` can be a recognized SEGA numeric release code or an object with a
recognized release `name` and nullable `code`; omitting it leaves a standalone
song's introduction unknown. A jacket key must be an R2 object key, not a URL.
The override jacket key is used when the standalone song is first cataloged.

For existing catalog charts, overrides keyed by canonical song title and
`DX:DIFFICULTY` or `STD:DIFFICULTY` can correct `chartConstant` and `charter`.
Non-null override values take precedence over supplemental metadata. A null
value falls through to supplemental or existing data; it does not clear it.
Run catalog sync, summary regeneration, and validation after changing overrides.

## GitHub configuration

The workflows reference the following **Actions secrets**:

| Secret | Purpose |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service-account credentials for Drive and Sheets |
| `OPENAI_API_KEY` | Score OCR and missing-title enrichment |
| `DISCORD_WEBHOOK_URL` | Review and workflow-failure notifications |
| `R2_ACCOUNT_ID` | Cloudflare account containing the jacket bucket |
| `R2_ACCESS_KEY_ID` | Jacket-bucket write credential |
| `R2_SECRET_ACCESS_KEY` | Jacket-bucket write credential |

The workflows reference the following **Actions variables**:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_DRIVE_FOLDER_ID` | Incoming score-image folder |
| `GOOGLE_PROCESSED_FOLDER_ID` | Destination for successfully imported images |
| `GOOGLE_DUPLICATES_FOLDER_ID` | Destination for duplicate images that can be reviewed and deleted |
| `GOOGLE_SPREADSHEET_ID` | Workbook containing the main score and import-review sheets |
| `GOOGLE_SHEET_NAME` | Main score sheet, currently `MainInfo` |
| `OPENAI_OCR_MODEL` | Model shared by score OCR and title enrichment |
| `SCORE_CAPTURE_TIME_ZONE` | Zone used only for capture timestamps that lack an explicit offset |
| `SEGA_CATALOG_URL` | Authoritative SEGA song catalog endpoint |
| `SEGA_JACKET_BASE_URL` | Base URL for authoritative SEGA jacket images |
| `CHART_SUPPLEMENT_METADATA_URL` | Zetaraku supplemental chart constants and charter names dataset |
| `R2_BUCKET_NAME` | Jacket object-storage bucket |
| `R2_PUBLIC_URL` | Public jacket Worker base URL used by the frontend build |

Endpoint, model, and timezone settings are explicit. The import workflow sets
`SCORE_IMPORT_CONCURRENCY: 4` directly in its job environment; it is not read
from an Actions variable. Configure GitHub Pages to deploy using GitHub Actions.

Generated catalog metadata stores only each jacket's R2 object key. The public
R2 base URL is supplied to Vite at deployment time through `R2_PUBLIC_URL`;
R2 credentials are available only to the metadata workflow.

## Supplemental catalog information

`npm run catalog:sync` downloads the Zetaraku dataset configured by
`CHART_SUPPLEMENT_METADATA_URL` once per run. It matches song title, artist,
DX/STD chart type, and difficulty; title-only matching is allowed only when
there is one candidate. UTAGE charts are excluded.

For both new and existing catalog charts, it reads exact constants from
`internalLevel` and chart designer names into `charter`. Display-derived
`internalLevelValue` is not accepted as an exact constant. Non-null local
overrides take precedence over supplemental values; when neither supplies a
value, an existing last-known value is retained. Missing information remains
unavailable rather than being estimated from the displayed level.

An unavailable source, unexpected schema, ambiguous chart, or major coverage
regression stops synchronization before generated data is written. The normal
workflow-failure Discord notification reports the failure. Check the job logs
and source response before retrying; use a verified song override for a specific
omission rather than editing the generated catalog directly.

Catalog sync also enriches Japanese canonical titles missing kana or romaji.
It makes separate structured OpenAI requests in batches of up to ten songs,
using `OPENAI_OCR_MODEL`, for kana readings and English titles, then derives
romaji with `wanakana`. This can require OpenAI even when no new score image
needs OCR. Existing title values are retained and additions are deduplicated.

## Validation and chart summaries

After spreadsheet archiving and catalog synchronization have assigned chart
IDs, the import workflow runs these stages in order:

```bash
npm run data:validate:source
npm run scores:summarize
npm run data:validate
```

Source validation checks the catalog and monthly score structures and verifies
that SEGA release codes agree with their mapped names. It skips chart-summary
validation because the summaries have not yet been rebuilt.

Summary generation reads all monthly archives and rebuilds
`src/data/scores/chart-summaries.json`. Each chart records its play count,
history months, and independent best achievement, combo, and sync with source
play references. Ties prefer higher achievement, later capture time, then the
lexicographically greater score ID. The file and its `generatedAt` timestamp
are preserved when the derived records have not changed. See the
[data model](data-model.md#score-archive) for status ordering and field semantics.

Full validation then checks the summary structure and requires its chart records
to exactly match a fresh derivation from the archive. A validation failure stops
the workflow before the data commit and deployment. Local archive maintenance
must also regenerate and validate summaries; `catalog:sync` does not regenerate
them by itself. Deployment validates the committed snapshot and does not rebuild
summaries.

## Running the workflow

Run **Import New Scores** from the Actions tab for a real-data import. The
optional `image_limit` input limits actionable images. Scheduled runs are
Monday at 08:22 UTC (04:22 Eastern during daylight saving time, 03:22 during
standard time).

The jobs import images, archive the spreadsheet, synchronize catalog metadata,
validate source data, regenerate chart summaries, and validate the complete
result. Changed data produces one `Add new score data` commit. The workflow
then explicitly calls **Deploy to GitHub Pages** when data changed; it skips
deployment when there is no change. The deployment workflow also supports
pushes to `main` and manual runs, validates data, builds the app, and adds a
`404.html` copy of the app entry point for chart routes.

Image-level review failures do not block accepted scores. Infrastructure
failures stop downstream jobs and send a separate Discord notification. The
`image-import-report` artifact retains `.sync/image-import.json` for seven days;
intermediate score archives and generated data are retained for one day.

## Asset caching

The production build generates a service worker with `vite-plugin-pwa`.
Vite-built JavaScript, CSS, fonts, frames, and icons are precached and updated
automatically when their content hashes change. Jacket images use a separate
Cache First runtime cache scoped to `VITE_JACKET_BASE_URL`, limited to 300
images and 90 days; browser quota pressure may evict entries sooner. Service
workers are not enabled by the normal Vite development server.

Caching is configured in [`vite.config.ts`](../vite.config.ts). Page
navigations use the network; the service worker does not provide an offline
HTML fallback. The jacket runtime cache is enabled only when
`VITE_JACKET_BASE_URL` is configured.

To inspect production caching locally, run `npm run build` followed by
`npm run preview`. Replacing an image at the same jacket URL may leave a cached
copy visible until expiration or eviction; use a new object key for a new URL,
or clear the site's browser cache when checking a replacement.

## Implementation references

- [Environment template](../.env.example) and [commands](../package.json)
- [Import workflow](../.github/workflows/import-new-scores.yml)
- [Deployment workflow](../.github/workflows/deploy-pages.yml)
- [Image importer and OCR cache selection](../scripts/import-images.mjs) and [durable import log](../scripts/lib/import-log.mjs)
- [Summary generation](../scripts/lib/chart-summaries.mjs) and [data validation](../scripts/validate-data.mjs)
- [Review fields and retry rules](../scripts/lib/review-queue.mjs)
- [Manual entry and corrections](../scripts/lib/score-review-corrections.mjs)
- [Score validation and derived values](../scripts/lib/score-import-record.mjs)
- [Standalone overrides](../scripts/lib/catalog-overrides.mjs) and [catalog synchronization](../scripts/sync-catalog.mjs)
