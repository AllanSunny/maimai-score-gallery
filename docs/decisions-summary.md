# maimai-score-gallery decision history

Original summary generated: 2026-08-15  
Repository review: 2026-09-09 (current working tree, including uncommitted changes)

This is a curated, human-readable history of the owner’s key architectural, functional, behavioral, and operational decisions, adapted from a personal conversation summary. It intentionally emphasizes decisions over implementation chatter. When a later decision superseded an earlier one, both are recorded and the current decision is marked clearly.

This record documents major decisions, not every implementation change or a complete conversation transcript. Historical incident counts describe the recorded event, not current totals. Earlier entries are retained for context; explicit supersession notes and the latest relevant section take precedence. The repository review checks current behavior against source and Git history; it does not independently verify every historical incident or reconstruct undocumented personal rationale.

No credential values, private cloud identifiers, tokens, webhook URLs, or service-account contents are included. This review covers this document, not a security or asset-license audit of the entire repository.

For current schemas, see [Data model](data-model.md). For setup and operational procedures, see [Operations](operations.md).

### Current status and recent additions

- Public, view-only React/Vite app on GitHub Pages; private import operations use Drive, Sheets, OpenAI, and GitHub Actions.
- Monthly score archives and derived chart summaries are implemented; frontend history loading remains eager (sections 31–38).
- UTAGE, owner authentication/private notes, and the Top 50 implementation remain deferred.
- Recent additions: the expandable song grid (51), cross-version chart navigation (52), centralized song jackets without duplicated catalog objects (53), and the iterative song-list controls work (54–65).
- Start with the [rationale ledger](#rationale-ledger) for the reasons behind the decisions; jump to the [latest decision](#decision-65) for the newest addition.

<a id="rationale-ledger"></a>

## Rationale ledger

[Jump to the decision history](#decision-1) · [Latest decision](#decision-65)

This ledger stays near the top as decisions are appended below. Links point to stable decision IDs. Section 44 was the ledger's former location; that number remains reserved and its old link still resolves here.

**Evidence:** Earlier entries draw on the sanitized conversation export through 2026-08-28. This update also reviewed relevant recent tasks and this conversation. Dates and task titles identify supporting discussions without publishing private transcript links. Entries explicitly labeled “Implementation rationale” describe the code's tradeoffs where the reviewed history does not establish the owner's personal reason. These are paraphrases, not quotations or a claim to have reviewed every conversation.

**Maintenance:** Append new numbered decisions at the end, add a stable `decision-N` anchor and a linked rationale here, and update the latest-decision link. Keep existing IDs; mark superseded choices rather than renumbering them. Record the motivating request or incident when known, and label inference when it is not.

- **Spreadsheet and UTC rules** ([1](#decision-1)): EXIF is closer to the real play time than Drive creation time, and UTC prevents travel/DST ambiguity while Eastern remains a presentation preference.
- **View-only public scope** ([2](#decision-2)): The owner wanted a personal tracker that friends could browse and a project to show on GitHub, with view-only access for other users (2026-08-05). Keeping administration separate supports that scope.
- **React/Vite/Tailwind and reusable UI** ([3](#decision-3)): This combination provides fast local iteration, typed components, static deployment, and room to evolve the design without committing early to a backend-rendered app.
- **Categorized titles** ([4](#decision-4)): The owner wanted to find songs by whichever name they remembered—romaji, a translation, or both—and later requested keyboard-friendly spellings such as `ijou` (2026-08-05 and 2026-08-15). Categorized titles preserve those different search paths.
- **Song/version/chart/score separation** ([5](#decision-5)): Stable chart IDs and separate DX/STD versions prevent title collisions and make score history attach to the exact playable chart.
- **Automated catalog and R2 jackets** ([6](#decision-6)): The owner explicitly wanted to avoid hand-maintaining metadata for 800+ songs and was concerned about visitor traffic hitting official jacket URLs (2026-08-05). Importing only recorded songs and serving stored jackets answers both concerns.
- **One orchestrated Actions workflow** ([7](#decision-7)): Ordered jobs make dependencies and failures visible, prevent partial publication, produce one data commit, and explicitly deploy after bot-authored changes.
- **Move OCR out of Apps Script** ([8](#decision-8)): Apps Script execution limits were repeatedly reached; Node/Actions provides longer execution, concurrency control, tests, and local reproducibility.
- **Strict OCR plus catalog validation** ([9](#decision-9)): OCR is probabilistic, so structured output and authoritative title/chart checks stop plausible-looking errors from entering durable data.
- **Durable review and idempotency** ([10](#decision-10)): Cached OCR, fingerprints, and editable corrections make retries cheaper while preventing the same image or play from being appended twice.
- **Remove transitional code** ([11](#decision-11), [15](#decision-15), [16](#decision-16)): One-off migrations and compatibility paths become maintenance hazards after their data is reconciled; only behavior still required by real history should remain.
- **Normalized duplicate identity** ([12](#decision-12)): Equivalent floating-point strings and legacy rows bypassed simpler checks, so identity must normalize time/title/chart/difficulty and four-decimal achievement.
- **Artifact-path fix** ([13](#decision-13)): Jobs must restore generated data at the exact path consumed by the next job; otherwise a successful import can silently deploy stale data.
- **Region-aware OCR** ([18](#decision-18)): Fixed screen regions prevent the player name and nearby UI labels from being mistaken for song metadata while still allowing clipped-title resolution.
- **Review sheet as manual entry** ([19](#decision-19), [25](#decision-25)): Some captures cannot be recovered reliably by OCR; a validated human-authored row is cheaper and more accurate than repeatedly asking the model.
- **Retained OCR cache** ([20](#decision-20)): OCR is the expensive/non-deterministic step, so retaining successful structured output enables correction and retry without repeated model cost.
- **Separate duplicate folder** ([21](#decision-21)): Keeping duplicates away from successful captures makes cleanup obvious without risking a second score insertion.
- **PWA/runtime caching split** ([22](#decision-22)): Bundled assets are immutable and safe to precache; remote jackets are numerous and need a bounded, evictable runtime cache.
- **Configuration/redaction boundary** ([23](#decision-23)): Deployment-specific endpoints and model choices must remain configurable, while credentials and private identifiers never belong in public data or personal exports.
- **Serialized workflow with bounded workers** ([24](#decision-24)): OCR benefits from limited parallelism, but Drive/Sheets/data mutations need one ordered owner to avoid races and quota bursts.
- **Standalone overrides** ([26](#decision-26)): Removed songs still need stable catalog identity, but should not be forced onto unrelated current SEGA entries or maintained in a second competing metadata system.
- **Durable rejection recovery** ([27](#decision-27), [28](#decision-28), [29](#decision-29)): Discord is only a notification; the import log must remain authoritative so a failed review-sheet write can be reconstructed without another OCR call.
- **Shared sheet growth** ([28](#decision-28)): Main and review sheets failed at the same row boundary, so one tested capacity helper is safer than independent fixes.
- **Sync-status audit** ([30](#decision-30)): Generic Sync had been conflated with FS and stale row numbers made correction risky; image-position re-audit plus conservative fingerprint resolution repairs data without guessing.
- **Monthly score chunks** ([31](#decision-31)): Play history will grow continually, so UTC-month partitions enable incremental updates and future on-demand loading without changing score identity.
- **Independent chart summaries** ([32](#decision-32)): Achievement, combo, and sync bests can come from different plays; a compact derived index supports list sorting without loading judgment history.
- **Nullable legacy Critical Perfect** ([33](#decision-33)): An unavailable count is not zero and is not equal to Perfect; `null` preserves uncertainty while keeping real BREAK counts.
- **Genre and `introducedIn`** ([34](#decision-34)): SEGA already supplies category/version data, and retaining raw codes plus mapped names supports filtering while making the inferred mapping auditable.
- **Deferred frontend lazy loading** ([35](#decision-35)): The storage/index foundation should be validated first; replacing eager imports is a separate behavior change that can then be measured and tested cleanly.
- **Compact summary references** ([36](#decision-36)): Object keys already provide chart identity, while per-best score IDs and timestamps preserve independent provenance without duplicating full play data.
- **Commit summaries before deploy** ([37](#decision-37)): Generated data must be durable in the repository before deployment; an ephemeral build-time rewrite can silently publish stale or unreproducible state.
- **Frontend ownership boundary** ([38](#decision-38)): Catalog metadata, cumulative bests, and detailed histories have different size and update characteristics, so keeping their responsibilities separate supports fast browsing and future lazy loading.
- **One supplemental source** ([39](#decision-39)): An audit found genuine gaps in Diving-Fish and broader coverage in Zetaraku. The owner chose one live supplemental source instead of merging providers on every run (2026-08-23); retained values protect historical metadata where the replacement has gaps.
- **Exact constants only** ([39](#decision-39)): A displayed level range is not a chart constant; accepting only explicit internal levels avoids turning an estimate into authoritative data.
- **One supplemental fetch** ([39](#decision-39)): A weekly CDN download is simpler and gentler than per-song requests and makes validation atomic.
- **Fail-fast supplemental validation** ([40](#decision-40)): External schemas can drift or return partial data, so the importer must reject the complete run before overwriting trustworthy generated metadata.
- **Override exceptional omissions** ([40](#decision-40)): A documented local exception is safer and more auditable than fabricating a provider value or manually editing generated JSON.
- **Responsive chart details** ([41](#decision-41)): The owner rejected a tiny two-column mobile frame because its decoration and text lost presence and readability (2026-08-24). Keeping a readable frame and hiding the duplicate information card brings history closer to the fold without that compromise.
- **Capture-timestamp preflight** ([42](#decision-42)): An exact EXIF instant is available before score OCR and is strong evidence of an accidental re-upload, so checking it first avoids needless download or OCR work while retaining hash and score-identity checks as independent safeguards.
- **Derived combo status** ([43](#decision-43)): A 101% play was imported as AP rather than AP+. The owner chose deterministic judgment/achievement rules, removed combo correction, and required spreadsheet loading to prefer derivation when possible (2026-08-28). `null` separates no combo achievement from rank.
- **Fixed UTC scheduling** ([45](#decision-45)): The owner explicitly accepted Monday 08:00 UTC so the workflow would no longer need to check the current time by timezone (“Update score import schedule,” 2026-08-31). Preserving a fixed Eastern wall-clock time was no longer required.
- **Network-only HTML and sharing metadata** ([46](#decision-46)): Implementation rationale: a fresh navigation document avoids retaining a stale app shell, while stable public metadata gives shared gallery links a predictable image. The reviewed history does not establish a more specific owner-stated reason for these changes.
- **Score links without history clutter** ([47](#decision-47)): The owner wanted individual score links, but opening and closing records was adding unwanted browser-history entries. Updating the fragment with replacement preserves sharing while keeping Back/Forward for page navigation (“Add score history anchors,” 2026-08-31).
- **Scroll behavior by action** ([47](#decision-47)): The owner wanted new chart pages to begin at the top without visibly scrolling up from the song list, score deep links to retain smooth scrolling, and Back/Forward to remember prior positions. These are distinct interactions, so one global smooth-scroll rule was insufficient (“Add score history anchors,” 2026-08-31).
- **Chart rating and incomplete B50** ([48](#decision-48)): Implementation rationale: deriving a contribution from an exact constant avoids storing another value that can drift; leaving it unavailable without a constant avoids presenting an estimate as exact. The reviewed history does not establish an additional owner-stated motivation for the formula or a completed B50 implementation.
- **OCR tuning and configuration cleanup** ([49](#decision-49)): The owner encountered incomplete OCR output, asked to inspect token use, and confirmed that increasing the limit worked (2026-08-15). The later cleanup requested removing unused environment options. That supports documenting the settings actually consumed; it does not establish that each hard-coded timeout/retry value was personally selected by the owner.
- **Off-minute import scheduling** ([50](#decision-50)): After the minute-0 schedule was delayed on consecutive Mondays, the owner moved the weekly import to minute 22 to avoid GitHub Actions' higher-load start-of-hour window (“Set import schedule to minute 22,” 2026-09-07).
- **Expandable song grid** ([51](#decision-51)): The score list became a song-first browsing surface: one recency-sorted card per canonical song, inline chart summaries, and DX/STD switching without leaving the list. Several expansion strategies were tried before settling on stable card order and breakpoint-specific scroll behavior (2026-09-07–08).
- **Cross-version chart navigation** ([52](#decision-52)): Matching DX and STD difficulties belong to the same logical song, so chart detail pages provide a direct version switch while preserving the reader's position (2026-09-07).
- **Canonical catalog objects and centralized jackets** ([53](#decision-53)): The owner preferred one parsed object graph and one jacket URL resolver over hydrated or catalog-specific copies. Lightweight lookup results supply parent context without duplicating songs, versions, or charts (2026-09-09).
- **Initial song filters** ([54](#decision-54)): Add multi-select combo, sync, genre, difficulty, and level filters plus an independent Played only toggle.
- **Contextual filter refinement** ([55](#decision-55)): Require chart filters to match the same chart and show Played only only when difficulty or level supplies context.
- **Initial broad sorting model** ([56](#decision-56)): Start with a broad candidate set and one reusable ascending/descending direction control.
- **Final sort criteria and tie-breakers** ([57](#decision-57)): Remove low-value criteria and define deterministic achievement-based and level-based tie-breakers.
- **Filter → metrics → sort pipeline** ([58](#decision-58)): Calculate aggregate sort metrics from only the charts retained by active filters.
- **Normalized multilingual search** ([59](#decision-59)): Cache one derived search string per grouped song without adding frontend search data to the catalog.
- **Persistent control state** ([60](#decision-60)): Persist controls independently from pagination and make explicit clear actions replace saved values.
- **First dropdown extraction** ([61](#decision-61)): Give filtering and sorting dedicated selectors with shared visual and dismissal conventions.
- **Generic dropdown consolidation** ([62](#decision-62)): Replace the parallel selectors with one single- or multi-select UI primitive.
- **Initial collapsible filter row** ([63](#decision-63)): Move filters into an animated row and resolve dropdown clipping without removing the panel from the DOM.
- **Final responsive control layout** ([64](#decision-64)): Preserve control grouping and ordering across the centralized wide-layout breakpoint.
- **Control ownership and runtime types** ([65](#decision-65)): Focused components and runtime value lists keep UI ownership, validation, and TypeScript types aligned.

<a id="decision-1"></a>

## 1. Original spreadsheet importer

### Image-derived score data

- The initial system would remain a Google Apps Script that watches a Drive folder, parses maimai DX result screenshots, and appends them to Google Sheets.
- Capture time needed to come from original HEIC metadata rather than Drive creation time wherever possible.
- Rating changes below the rating display needed to be captured, including a visible `+` sign for positive values in Sheets.
- The score row would contain totals plus judgment breakdowns by note type: break, tap, hold, slide, and touch.
- Critical-perfect data initially fell back to regular Perfect for older screens. This was later superseded by the nullable representation in section 33 because copying produced misleading duplicates.
- Rank values below A should be represented as `Failed`.
- Notes/location could be imported but eventually must be private to the authenticated owner.
- The spreadsheet column order was explicitly defined and became the source contract for import/export code.

### Capture-time behavior

- Early attempts to use Drive `createdTime` were rejected because that is not the game capture time and caused API/field issues.
- iOS-manually adjusted timestamps could not be assumed to survive every Drive upload path.
- Current implementation: EXIF capture time first, then Drive image metadata, then Drive `createdTime` as a fallback. The fallback is upload time, not necessarily play time. A supplied review correction overrides the selected time; missing capture metadata does not automatically require review.
- Offset-free timestamps may default to Eastern for legacy input.
- Final persistence rule: store UTC throughout the sheet/archive and explicitly convert to Eastern only in the application UI.

<a id="decision-2"></a>

## 2. Public app scope

- The project should remain primarily a personal tracker while allowing other people view-only browsing.
- Public users should be able to browse scores and charts.
- Uploading and admin tools should not exist in the GitHub Pages frontend.
- The first version should fetch data from the spreadsheet-backed pipeline rather than implement in-app uploads.
- The repository should be suitable for GitHub presentation without exposing owner-only operations.

### Initial public navigation

- The main page should stay minimal while the information architecture is being explored.
- It should introduce three destinations:
  - Profile summary: player name, icon, rating, and title.
  - Top 50: Best 50 songs.
  - Score list: all records, searchable by song.

<a id="decision-3"></a>

## 3. Frontend platform and styling

- Use React with TypeScript.
- Use Vite for local development and production builds.
- Host the static application on GitHub Pages.
- Use Tailwind CSS and preserve the ability to author reusable custom Tailwind components.
- Preview work locally through the Vite development server before pushing.
- Use Rodin Pro as the default application font after the font assets were added.
- Assets imported from `src/assets` should be handled by Vite and emitted as hashed build assets.
- Static bundled assets should be cacheable.

### Reusable UI decisions

- Build a reusable `SongInfo` component.
- It should display song title, applicable alternate titles, jacket, chart type, difficulty levels, nearby chart constants, current achievement records, and links to chart details.
- Each chart detail page should eventually show deeper statistics and a score-progression timeline.
- Song lists should use bounded pagination/infinite loading rather than render everything at once.
- Returning from a chart page should restore the previous list/scroll position.
- Add reusable song-detail frames using the supplied DX/STD difficulty-frame assets, absolute positioning, and custom fonts.
- The displayed level should support `+`, bold styling, centered fixed-width layout, and independently positioned superscript behavior.

<a id="decision-4"></a>

## 4. Titles, aliases, and search

### Early alias model

- `englishTitle` was too narrow because an alternate could be romaji, a translation, or both.
- Search should match whatever title form the owner remembers.
- Imported alternate titles were initially represented as a comma-separated list and normalized to lowercase.
- Duplicate score rows could introduce new translations, but new imports must not overwrite existing metadata blindly.
- Scores themselves should not store alternate titles; alternate titles belong to song metadata.

### Final categorized title model

- Replace the undifferentiated alias approach with categorized song titles:
  - canonical
  - kana
  - romaji
  - English
  - remaining legacy/general aliases
- Existing aliases should be classified as romaji or English where possible.
- Relevant kana should be derived/added for existing songs when authoritative source text allows it.
- OpenAI should not invent romaji if SEGA kana can be deterministically converted.
- Romaji should favor practical keyboard/wapuro spellings.
- Example decision: `ijō` should become `ijou`; this is not equivalent to blindly replacing every macron with doubled vowels.
- Search should match partial strings across kanji, kana, romaji/wapuro, English, canonical titles, and aliases.
- Earlier frontend display showed canonical plus romaji and English only; the later display rule below also includes legacy aliases.
- Kana remains searchable but is not displayed as an alternate subtitle.
- Romaji, English titles, and legacy aliases are displayed on the frontend and remain searchable.

<a id="decision-5"></a>

## 5. Song, chart, and score schemas

- Create a centralized place to inspect application data structures instead of reverse-engineering generated JSON.
- Adopt only the recommended core song/chart/score models initially rather than model every possible future entity.
- Enforce those interfaces and validate generated JSON at runtime/build time.
- Move general modules such as catalog, validation, date/time, rank, song-title helpers, and types under `src/utils`.

### DX and STD representation

- A song with DX and standard charts must treat them as separate chart versions/entries.
- All difficulties in one version share the same chart type.
- Chart type belongs at the version/chart-information level rather than being repeated per difficulty display.
- The UI should show DX/STD beside the chart/song information, not on every difficulty row.
- Temporary dual-chart development fixtures should be removed.
- `Magical Flavor` was selected as the real-world dual-chart case.

### Metadata requirements

- Catalog songs should store artist data.
- Once SEGA artist import was confirmed, artist became required for a valid song.
- Chart structures should support note-designer/charter names.
- Catalog synchronization should enrich charts with constants and charter data from suitable public sources.
- UTAGE requires a distinct model and was explicitly deferred.

### Score records

- Store totals and note-type judgment breakdowns.
- Keep compatibility with older combined-Perfect layouts, using the nullable representation finalized in section 33.
- Derive rank from achievement on the frontend rather than store it per play.
- Rank thresholds follow the spreadsheet formula from `Failed` through `SSS+`.
- A failed play remains a legitimate score record rather than disappearing.

<a id="decision-6"></a>

## 6. Catalog and jacket strategy

- Avoid manually maintaining metadata tables for more than 800 songs.
- Dynamically create metadata entries during import and allow later overrides.
- Pull authoritative catalog data programmatically, following patterns used by public rhythm-game catalog projects where appropriate.
- Only fetch jacket art for songs tied to recorded scores.
- Avoid hotlinking official jacket URLs from every visitor session because that shifts public traffic to SEGA.
- Storing hundreds of jacket assets is acceptable, but object storage is preferable to checking all remote images into the repository.

### Cloudflare R2

- Use Cloudflare R2 for jacket storage.
- Support both local catalog synchronization and GitHub Actions synchronization.
- Keep R2 administrative credentials out of the GitHub Pages client.
- The frontend should receive only the object key/path required to identify a jacket.
- Do not expose a raw development bucket URL in song metadata.
- Deliver objects through a controlled public endpoint/Worker so caching and abuse controls can be applied.
- Consider rate limiting, caching, and request filtering to reduce the risk of malicious actors exhausting free-tier limits.

### Catalog synchronization behavior

- Initial proof-of-concept sample data used Tsunagite, but all hardcoded sample/seed data was later removed.
- `seed-titles.json` became obsolete and was deleted along with every reference.
- `song-overrides.json` was moved into `src/data`.
- Initially, catalog sync processed only net-new song identities. Sections 34 and 39 extend synchronization to refresh release and supplemental chart metadata for existing songs; existing jackets are still reused.
- Unknown songs should not be committed to the score archive.
- Unknown names should be retained in an artifact/review mechanism so they can be corrected and resynced.
- A Discord notification was preferred over public GitHub issues because rejected-score details should remain private.

<a id="decision-7"></a>

## 7. GitHub Actions architecture

### Early separate workflows

- Spreadsheet score pulling and catalog/jacket pulling were initially separated.
- Spreadsheet sync should run first; song sync should follow only after score data is available.
- A manual trigger should be available in addition to scheduled execution.
- Earlier schedule: Sunday at midnight Eastern, accounting for daylight-saving changes. Superseded by the fixed Monday UTC schedule in section 45.
- Node 24 was explicitly preferred over Node 20.

### Final orchestrated workflow

- Consolidate the stages into one visible master workflow map, similar to a quality-gate workflow with dependent jobs.
- Name it **Import New Scores**.
- Current dependency chain:
  - import images
  - archive spreadsheet scores
  - synchronize catalog and jackets
  - commit generated data once
  - deploy GitHub Pages if data changed
- The complete chain should produce one general commit: `Add new score data`.
- New scores for existing songs must still create the data commit even if no jacket/catalog work is needed.
- The optional `image_limit` is a raw test/import limit, not concurrency.
- Scheduled runs should process all new images by default; the limit exists only for controlled testing.
- Accepted images must continue through later jobs even when other images need review.
- GitHub Pages deployment must be invoked explicitly because pushes made with the default Actions token do not trigger another workflow automatically.
- The Pages workflow should remain independently runnable for normal pushes/manual deployment while also being reusable from the import workflow.

### TLS handling

- SEGA/maimaidx certificate-chain failures occurred locally and in GitHub Actions.
- Do not solve this by globally disabling TLS verification.
- GitHub Actions should construct/use the missing certificate chain for affected catalog/jacket downloads.

<a id="decision-8"></a>

## 8. Image import migration from Apps Script

- Google Apps Script frequently timed out, so image ingestion should move to the GitHub Actions/local Node pipeline.
- Image parsing must occur before spreadsheet archive and song metadata import.
- Direct Google Drive and Sheets API access was selected instead of an Apps Script HTTP bridge.
- The existing sheet tab name was confirmed as `MainInfo` during API setup.
- Google APIs/service-account access should be verifiable independently before running OCR.
- The workflow should also remain runnable locally, including eventual Windows compatibility.

### Image quality and cost

- Avoid requiring manual crops on the phone.
- Image quality varies, so preprocessing should prioritize OCR reliability over aggressive shrinking.
- Preserve a full-frame high-quality image, shrink only when above a safety cap, and avoid enlargement.
- Keep JPEG quality high and preserve colored/small text edges.
- Initially, image processing was sequential with an optional test limit. Section 24 supersedes sequential processing with bounded workers and serialized shared-state operations.

<a id="decision-9"></a>

## 9. OCR and validation behavior

### Title validation

- A title may be clipped at either the beginning or the end of the game UI.
- Resolve clipped titles against the authoritative maimai catalog.
- Validate song existence before allowing a score farther into the pipeline.
- Use artist data to disambiguate songs sharing the same title.
- Fully visible Latin/English titles such as `UNWELCOME SCHOOL`, `Lover's Trick`, and `ANiMA` are original titles and must not be returned as empty.
- If chart type, difficulty, achievement, or other required score information cannot be parsed, reject the entry with a useful warning.

### Judgment validation

- Parse both overall judgment totals and the top-screen note-type table when those regions are visible.
- Overall totals are optional validation data because the UI can obscure them; missing totals may be derived from a complete note-type breakdown.
- A complete total-only result is also valid when the note-type breakdown is unavailable; store the breakdown as unavailable rather than fabricate zeroes.
- When both totals and breakdowns are readable, use totals as a consistency check.
- Older result screens combine non-break critical-perfect judgments into Perfect. For that layout, overall Perfect equals ordinary Perfect plus break Perfect plus break Critical Perfect; the modern separated layout retains the current validation rules.
- The initial fallback copied Perfect into unreadable Critical Perfect. Section 33 supersedes this with `null`, preserving the usable score without fabricating a count.
- Fast/slow and rating change may default appropriately when genuinely absent, but required score identity cannot.

### OpenAI behavior

- Use strict structured output.
- Move and rename the prompt to `scripts/lib/maimai-score-prompt.md`; all references should use that name.
- Cached OCR is valid only for the same source hash and prompt version.
- Increasing the prompt version invalidates cached OCR on an actionable retry. It does not automatically reprocess imported images, and a complete manual correction can still bypass OCR.
- Earlier configuration exposed image detail and output-token limits through environment settings. Section 49 records the current fixed options.
- After empty-output failures, include OpenAI response status and incomplete reason in diagnostics.
- After invalid-JSON failures, include the parse reason and response status.
- Initially, verbose OCR errors were omitted from Discord. Sections 25 and 27 supersede that choice: private review notifications now include detailed errors.
- Successful OCR reports retain token usage. OCR output errors attach diagnostics including input/output/reasoning-token counts and any available reasoning summary; successful responses do not retain the reasoning summary.
- Set reasoning effort explicitly (`low`) rather than inherit an opaque default.
- Earlier token-limit tuning required forwarding `OPENAI_OCR_MAX_OUTPUT_TOKENS` from repository variables. This variable is no longer consumed; see section 49.
- The working output limit was raised to 5000 after one valid image exhausted 3000 tokens.

<a id="decision-10"></a>

## 10. Review, retry, and idempotency

### Import log

- Track Drive file identity, source hash, OCR JSON/model/prompt version, score fingerprint, target spreadsheet row, and import status in `_ScoreImportLog`.
- Successful OCR should be retained so later review corrections can avoid another OpenAI call.
- Imported and migrated records should use the same `IMPORTED` status rather than preserve a special migration exception.
- A processed-folder guard was deemed unnecessary because processed files are renamed and moved clearly.

### Visible review sheet

- Keep **Score Import Review** visible so the owner can edit corrections directly.
- Move Drive File ID to the final column.
- The owner added real checkbox validation for Retry and validation rules for Status.
- `Ready` status was judged redundant; a checked Retry box is the sole retry trigger.
- Supported status text remains exact (`Review`, `Imported`, `Ignored`).
- Corrected title/artist capitalization does not matter for catalog matching.
- Retry without corrections retries validation/import and reuses matching cached OCR when available. It does not force a new model call; section 20 defines cache identity and invalidation.
- OpenAI structured-output failures also require Retry after the underlying prompt/token problem is fixed.
- Review artifacts only need short retention because durable correction state lives in Sheets and Discord identifies the filename.

### Notifications

- Use a private Discord channel webhook rather than opening public GitHub issues.
- Initially, notify with image filenames only. Superseded by sections 25 and 27: include detailed errors in the private notification.
- Keep detailed reasons in the review sheet and Actions logs.
- Wrap GitHub Actions links in `<...>` to prevent Discord embeds.
- Route fatal failures from any pipeline stage through the same Discord mechanism.

<a id="decision-11"></a>

## 11. Legacy migration and cleanup

- Previously processed files still in the incoming folder needed a one-off migration: rename to canonical title plus timestamp and move without paying for OCR again.
- Identical processed filenames did not need artist-based disambiguation.
- One image could be used for an end-to-end test, while genuinely new scores should remain in the normal batch.
- After validation, remove one-off migration code, local dry-run scaffolding, fake fixtures, and transitional helpers.
- Local testing should use the real live path rather than maintain a separate dry-run behavior.
- Remove old Apps Script feed calls and obsolete `api.ts` after the direct Sheets/committed-data architecture replaced them.
- Remove import-log header-upgrade compatibility once every active sheet used the final schema.
- Keep only compatibility still required by actual historical data, especially critical-perfect fallback.
- Accept only the final `Rating` header rather than carry unnecessary alternative header aliases.
- Preserve local `.env.local` support even as obsolete dry-run code is removed.

<a id="decision-12"></a>

## 12. Spreadsheet and archive duplicate handling

- A duplicate `enchanted wanderer` play revealed that legacy spreadsheet rows were not represented in `_ScoreImportLog`.
- Floating-point strings such as `100.02029999999999` and `100.0203` must represent the same four-decimal achievement identity.
- Final score fingerprint normalization includes:
  - UTC timestamp
  - Unicode/case/spacing-normalized title
  - chart type
  - difficulty
  - four-decimal achievement
- Future image imports must check both the import log and the existing score sheet before appending.
- Existing archive duplicates should be removed and must not reappear during synchronization.
- A recurring destructive live-sheet cleanup should **not** remain in the workflow. Archive reconciliation still collapses duplicate normalized play identities while synchronizing sheet rows.
- Duplicate spreadsheet cleanup was intentionally performed once, directly against the live sheet.
- The temporary one-off cleanup script and npm command were removed afterward.
- Result at that point:
  - Two duplicate live-sheet rows cleared.
  - Fifteen historical duplicate archive records removed.
  - Eighty-three unique archived scores remained.

<a id="decision-13"></a>

## 13. Score/archive/catalog artifact bug

- A successful image-import run inserted spreadsheet rows but failed to update the public app.
- Diagnosis: the single-file score artifact was flattened to repository root when downloaded, while catalog sync read `src/data/generated-scores.json`.
- Decision/fix: download the score artifact directly into `src/data` and log the received score count.
- Reviewable image rejection should not intentionally exit the importer with code 1; only an actual importer crash should fail the job.
- Accepted rows should archive/catalog/commit normally even when other images are rejected.

<a id="decision-14"></a>

## 14. Current public-display behavior

- Frontend alternate-title display: romaji, English, and aliases; kana remains search-only.
- Search: canonical, kana, romaji, English, and aliases, using partial/case-insensitive matching.
- Public scores/catalog come from committed generated JSON, not live Apps Script calls.
- GitHub Pages deploys after a successful data-changing import chain.
- Jacket URLs are constructed from a configured public base plus stored object identity; credentials never reach the client.
- Notes/location remain omitted from public generated score data until owner authentication is deliberately designed.

<a id="decision-15"></a>

## 15. Decisions about repository cleanliness

- Originally, Apps Script source was kept outside this repository in the Google Sheet project. Section 8 replaces Apps Script image ingestion with the Node/GitHub Actions importer.
- Remove temporary sample content, seed titles, dry-run branches, legacy migrations, obsolete feed/API wrappers, and transitional compatibility once their purpose is complete.
- Keep reusable real-path local commands and `.env.local` support.
- Raw conversation exports remain personal documentation outside Git.

<a id="decision-16"></a>

## 16. Superseded decisions at a glance

| Earlier direction | Current decision |
| --- | --- |
| Apps Script performs the complete image import | Node/GitHub Actions performs image import; Sheet-bound Apps Script is no longer repository architecture |
| App may read a published Apps Script feed | App reads committed generated JSON |
| One general alternate-title list | Categorized canonical/kana/romaji/English/aliases |
| Display all alternate title categories | Display romaji, English, and aliases; retain kana for search only |
| Separate score and catalog workflows | One orchestrated **Import New Scores** workflow with dependent jobs |
| Workflow push implicitly triggers Pages | Import workflow explicitly calls reusable Pages deploy |
| Reviewable rejection exits import with code 1 | Reviewable rejection is recorded/notified but accepted work continues |
| Potential GitHub issue for rejected songs | Private Discord notification plus durable review sheet |
| Recurring duplicate-sheet cleanup in workflow | One-time direct cleanup only; prevention stays in importer |
| Special `MIGRATED` log state | Treat migrated successes as ordinary `IMPORTED` records |
| Persistent dry-run/migration scaffolding | Use the real path locally and delete transitional code |
| Rank stored with every score | Rank derived from achievement in frontend |

<a id="decision-17"></a>

## 17. Non-negotiable constraints for future work

- The public site remains view-only.
- Private credentials and admin APIs never ship to GitHub Pages.
- Valid images must continue even if sibling images fail review.
- Invalid/ambiguous song titles never enter committed score data.
- UTC is the storage standard; Eastern is a presentation choice.
- Search remains broader than displayed alternate titles.
- DX and STD remain independently modeled versions.
- UTAGE remains unsupported until intentionally designed.
- Notes/location remain private and absent from the public score payload.
- Do not reintroduce recurring destructive cleanup for a bug that prevention now handles.
- Do not expose raw R2 bucket credentials or development URLs in catalog JSON.

<a id="decision-18"></a>

## 18. Region-aware OCR parsing

- OCR must interpret fixed screen regions instead of treating every visible word as a possible song title.
- Text in the player-name region must never become the song title, regardless of capitalization or changes to the displayed player name.
- Title matching remains tolerant of clipping on either end, Unicode punctuation, symbols, casing, and spacing, but catalog validation remains mandatory.
- Artist is the secondary discriminator when canonical titles collide.
- The prompt distinguishes legacy and modern judgment layouts before applying arithmetic validation.
- Score OCR only transcribes visible titles. Catalog sync separately uses OpenAI for missing Japanese-title kana readings and English titles, then derives romaji with `wanakana`; it shares `OPENAI_OCR_MODEL` with OCR.

<a id="decision-19"></a>

## 19. Corrections sheet as manual entry

- **Score Import Review** is both a retry queue and a practical manual-entry surface.
- Keep `Retry` immediately beside `Status` so corrections do not require horizontal scrolling to trigger processing.
- Corrections cover title, artist, UTC capture time, chart type, difficulty, level hint, achievement, sync, rating, rating change, FAST/SLOW, overall judgments, and every note-type judgment cell. Section 43 supersedes combo correction: combo is derived rather than entered or OCR-parsed.
- Corrected values override faulty OCR during retry.
- A sufficiently complete corrected row can bypass OpenAI entirely; cached OCR and human corrections reconcile through the same review/import-log records.
- If breakdowns are unknown but totals are known, accept totals and store the breakdown as unavailable. If totals are obscured but a complete breakdown is known, derive totals.
- Missing critical-perfect data alone must not make historical images impossible to import.
- UI consumers must render unavailable breakdowns explicitly and never imply that unavailable counts are zero.

<a id="decision-20"></a>

## 20. OCR cache and retention

- Successful OCR JSON is retained in the hidden `_ScoreImportLog` sheet, not merely in a temporary Actions artifact.
- Cache identity is based on the image/source hash and OCR prompt version; a prompt-version change invalidates prior OCR.
- Cached OCR has no time-based expiry under the current design and can be reused for retries and human corrections.
- Temporary workflow artifacts need only survive long enough to pass data between jobs and generate notifications.
- Changing only the configured model does not currently invalidate an otherwise matching cache entry; this remains a known future consideration.

<a id="decision-21"></a>

## 21. Duplicate image disposition

- A duplicate detected by source hash or normalized score fingerprint must not append another score.
- Duplicate images move to a dedicated Drive duplicates folder, separate from successfully processed images, so the owner can inspect and delete them.
- Successfully processed images continue to be renamed with resolved title and timestamp and moved to the processed folder.
- Folder identifiers and configured URLs are deliberately omitted from this export.

<a id="decision-22"></a>

## 22. Static asset and jacket caching

- Add PWA service-worker behavior for caching without introducing an install-oriented app manifest experience yet.
- Originally precache HTML alongside JavaScript, CSS, bundled images, and fonts. Section 46 supersedes HTML caching; the other asset classes remain precached.
- Use automatic service-worker updates and remove obsolete caches.
- Jacket images remain external runtime assets and use Cache First behavior.
- The jacket cache is bounded by an entry cap and maximum age and may be purged under browser storage pressure; it is not an unlimited permanent mirror.
- Current implementation bounds the runtime jacket cache to 300 entries for up to 90 days.
- Large OTF fonts dominate the static precache and may later be subset or converted to WOFF2, but PWA caching is the accepted first optimization.

<a id="decision-23"></a>

## 23. Configuration and redaction boundary

- External catalog, jacket, chart-supplement, OCR-model, and capture-time-zone settings are supplied through repository configuration.
- Secrets remain limited to service credentials/API keys and webhook credentials; the public frontend receives none of them.
- Environment variable names may be documented, but personal exports must never include live values, private IDs, tokens, response IDs, or signed/private URLs.

<a id="decision-24"></a>

## 24. Workflow concurrency and import limits

- **Import New Scores** uses one GitHub Actions concurrency group for the complete orchestration chain.
- `cancel-in-progress` remains disabled: if another import starts while one is running, the later run waits instead of canceling or replacing the active run.
- This prevents two runs from concurrently mutating Drive, the review/import-log sheets, generated score data, catalog data, and the final deployment.
- Image download, conversion, metadata extraction, and OpenAI OCR may use up to four concurrent workers by default.
- Catalog resolution, duplicate decisions, Drive state transitions, and all Sheets operations pass through one serialized queue so concurrent workers cannot race on shared state.
- Sheets writes are spaced through the shared queue, and a quota response cools the queue before later work continues rather than replaying a possibly partial write.
- The optional image limit is a raw image-processing limit for controlled tests, not a concurrency control.
- Scheduled runs process the complete actionable image queue by default.
- Checked image-free manual review rows are processed as durable review-sheet work items before incoming Drive images; they do not represent image concurrency and are not limited by the image-only test limit.
- Earlier scheduling used two UTC triggers plus an Eastern-time guard for Sunday midnight. Section 45 supersedes both the dual triggers and the guard.

<a id="decision-25"></a>

## 25. Image-free manual score rows

- A checked `Review` row without Filename or Drive File ID is a supported fully manual import.
- The review-sheet row number is its durable queue identity; no fake Drive image or synthetic filename is created.
- Manual rows require corrected UTC capture time, title, chart type, difficulty, achievement, and rating. Combo is derived when judgments are available; sync and judgment counts may be omitted.
- Rating change, FAST, and SLOW follow their documented defaults; missing Critical Perfect uses the nullable behavior in section 33.
- Note-type judgments must be complete as a group or entirely omitted.
- Manual entries still use catalog/chart validation and normalized score-fingerprint duplicate prevention.
- A successful or duplicate manual entry is marked `Imported`; a failure returns to `Review`, clears Retry, and stores a detailed error.
- Discord retains detailed failure text and identifies image-free failures by review-row number.
- Rejected-image insertion may reuse only a truly empty review row, never a populated image-free manual row.

<a id="decision-26"></a>

## 26. Standalone catalog overrides

- Extend `src/data/song-overrides.json` rather than introduce a separate retired-song metadata file.
- Overrides without `standalone: true` retain their previous behavior: they patch a matching SEGA entry's stable ID, categorized titles, artist, chart constants, or charter metadata.
- A standalone override represents a complete song missing from SEGA's current JP catalog.
- Standalone entries require:
  - explicit stable song ID;
  - canonical title key;
  - artist and genre;
  - at least one supported `DX` or `STD` chart with difficulty and level.
- Jacket key, chart constant, and charter may be null or omitted where historical data is unavailable.
- A jacket reference must be the complete R2 object key, including its folder prefix, not a public URL, bucket name, or bare filename.
- The importer merges standalone entries with the live SEGA catalog before title and chart resolution. Canonical, kana, romaji, English, and alias values can match the OCR title.
- Catalog synchronization generates the same song/version/chart stable-ID structure used by SEGA-backed songs and may enrich matching constants/charters from the supplemental source.
- The current combined loader still contacts SEGA during an import run. A standalone song is not rejected merely because SEGA omits it, but a total SEGA endpoint failure still prevents combined catalog loading.
- Do not map a removed song onto an unrelated SEGA song or edit generated catalog JSON manually.

### First standalone historical song

- `全世界共通リズム感テスト` was added as the initial standalone override.
- It is modeled as a Standard chart set with BASIC 6, ADVANCED 8, EXPERT 10, and MASTER 12.
- Historical public documentation supplied its artist credit, English/romaji search titles, and charter attribution.
- Constants were initially allowed to remain unknown, and its manually uploaded jacket is referenced only by an R2 object key.

<a id="decision-27"></a>

## 27. Durable rejection reporting and review-row recovery

- A Discord rejection notification is not proof that the corresponding **Score Import Review** write succeeded; the import report may contain a secondary `reviewQueueError`.
- A real incident occurred when four rejected images appeared in Discord but not in the review sheet.
- Root cause: the review sheet had 1008 grid rows, unchecked checkbox values made all preallocated rows look occupied, and the importer attempted a direct update at row 1009.
- An unchecked Retry checkbox by itself is now treated as empty capacity.
- A populated image-free manual row remains occupied and must never be selected as a reusable rejection slot.
- If `_ScoreImportLog` records an image as `REJECTED` but no visible review row exists, the next import run recreates the review row from the durable log and cached OCR title without making another OpenAI request.
- The recreated entry remains `Review` with Retry unchecked so the owner can correct it deliberately.
- Detailed errors remain in Discord as requested, in addition to the review sheet and import artifact.

<a id="decision-28"></a>

## 28. Shared spreadsheet grid expansion

- Direct Sheets `values.update` calls cannot address a row beyond a tab's current grid limit.
- Both **Score Import Review** and the main score sheet now use one shared grid-capacity helper before any calculated-row write.
- The shared behavior:
  - compares the target row with the tab's current row count;
  - performs no mutation when the target row already exists;
  - appends enough rows to reach the target, growing by at least 100 rows at a time;
  - then allows the original formatting/value write to proceed.
- Centralizing this check prevents the review and score sheets from drifting into subtly different boundary behavior.
- `_ScoreImportLog` does not need the same direct-write guard for new entries because it uses the Sheets append API with `INSERT_ROWS`, which grows the sheet as the log is appended.
- Main-sheet row expansion happens before applying rating-change formatting or writing score values, preventing a boundary failure partway through score insertion.

<a id="decision-29"></a>

## 29. Current recovery procedure for missing rejection rows

- Push the grid/recovery changes, then rerun **Import New Scores**.
- Previously rejected files with missing review rows are rediscovered through `_ScoreImportLog`.
- Their visible review entries are recreated without OCR cost; the owner can then provide corrections and check Retry normally.
- Do not manually erase the durable import-log entries to force recovery.

<a id="decision-30"></a>

## 30. Sync status semantics and legacy reconciliation

- Valid stored sync values are `Sync`, `FS`, `FS+`, `FDX`, `FDX+`, or `null`.
- `null` means that no sync badge is present; do not persist a `None` string.
- `Sync` represents the generic SYNC PLAY badge and must not be promoted to an FS-family status.
- `FS`, `FS+`, `FDX`, and `FDX+` are invalid with `combo: null` because they require at least a full combo.
- The original importer/prompt did not distinguish generic Sync deterministically, so all eligible legacy processed images required a one-off sync-position audit.
- Keep the one-off audit isolated from permanent import code and split OCR audit from mutation/application.
- Retain the audit report as the application input so a failed apply can be retried without paying for OCR again.
- Write long-running audit progress incrementally and atomically.
- Spreadsheet row numbers are informational, never durable identity. Re-resolve against the current sheet using fingerprints/retained score identity.
- Refuse ambiguous or missing matches; do not guess a row. The refusal of 228 unresolved rows was a safety success, not permission to fall back to stale row numbers.
- Missing `LEGACY-SHEET-ROW-*` Drive references are expected historical gaps and may be ignored.

<a id="decision-31"></a>

## 31. Monthly score archive architecture

- Replace the monolithic generated score archive with `src/data/scores/YYYY-MM.json` files.
- Partition strictly by UTC month from `playedAt`.
- Automatically create a file for each newly encountered month.
- Rewrite only months whose contents changed.
- Preserve stable score IDs and exact score payloads during migration.
- Clear checked-out monthly artifacts before restoring workflow artifacts so removed files cannot remain stale.
- Keep the current eager frontend combination temporarily; monthly on-demand loading is the planned next frontend phase.

<a id="decision-32"></a>

## 32. Derived chart summaries

- Store `src/data/chart-summaries.json` as a lightweight index keyed by stable `chartId`.
- Each played chart stores play count, relevant UTC history chunks, and independent source references for best achievement, combo, and sync.
- Best achievement, combo, and sync are cumulative properties and may come from different plays.
- Combo order among achieved statuses: `FC < FC+ < AP < AP+`. A null combo is omitted when selecting the best combo; if every play is null, the chart summary stores `bestCombo: null`.
- Sync order: `null < Sync < FS < FS+ < FDX < FDX+`.
- Equal-status tie-breakers are higher achievement, later timestamp, then stable score ID.
- Rebuild summaries from all monthly scores to remain correct after corrections, deletions, month moves, duplicate removal, or chart relinking.
- Preserve `generatedAt` and avoid a rewrite when summary content is unchanged.
- Generate once after catalog synchronization, when new scores have final chart IDs. The earlier twice-per-import generation was deliberately removed as redundant.
- Maintenance workflows that change archives without catalog sync must explicitly run the summary generator.
- Validation must compare committed summaries with a fresh in-memory derivation.

<a id="decision-33"></a>

## 33. Legacy critical-perfect representation

- Older layouts combine CRITICAL PERFECT and PERFECT for TAP, HOLD, SLIDE, and TOUCH while BREAK remains separate.
- Do not copy combined Perfect counts into Critical Perfect.
- Store unavailable legacy non-break critical-perfect counts as `null`.
- Reserve numeric zero for an observed zero.
- Keep the combined non-break count under `perfect` and preserve BREAK's real critical-perfect value.
- Normalize the old copied signature when reading spreadsheet rows so it cannot return during later synchronization.
- One hundred eleven existing legacy plays were reconciled in two monthly chunks.
- Preserve a separately recorded overall critical-perfect value; clear it only when it is demonstrably the copied Perfect fallback.
- Frontend judgment displays must render `null` as unavailable rather than zero.

<a id="decision-34"></a>

## 34. Genre and game-release metadata

- Store SEGA `catcode` as `Song.genre`.
- Store the introduction release as `Song.introducedIn: { code, name } | null`.
- Keep the raw SEGA version code for traceability and map it to the named release family for display/filtering.
- Use `introducedIn` rather than `version` to avoid ambiguity with the song's existing DX/STD `versions` array.
- The code mapping is based on ranges observed in SEGA's public catalog correlated with the publicly documented release chronology; no authoritative published numeric mapping was found.
- Known families span original maimai through CiRCLE PLUS. An unknown future range must fail validation until explicitly mapped.
- Backfill existing catalog records and allow metadata overrides to refresh standalone records on later syncs.
- A standalone song may store a verified named release with `code: null` when its exact historical SEGA batch code cannot be established.
- `全世界共通リズム感テスト` is category `maimai`, introduced in Splash, and retains its existing Standard 6/8/10/12 chart definition. Its supplied BPM of 120 remains deferred until BPM joins the catalog schema.

<a id="decision-35"></a>

## 35. Current data-loading boundary

- Monthly history and chart summaries are now generated and validated, but the frontend still eagerly imports all monthly score files for compatibility.
- The next frontend architecture should use catalog plus chart summaries for initial search/filter/sort and load only referenced monthly histories when a song or chart is opened.
- Do not claim the initial-memory optimization is complete until eager monthly imports are removed.

<a id="decision-36"></a>

## 36. Compact chart-summary representation

- Keep each stable `chartId` only as the object key in `chart-summaries.json`; do not repeat it inside the summary value.
- Preserve `scoreId` independently for best achievement, combo, and sync because each cumulative best may come from a different play.
- Preserve `playedAt` on every best reference even though it can be recovered from the score archive; it is small, useful for deterministic provenance, and may support future UI display without loading monthly history.
- Use summaries as a compact initial-load index rather than as a replacement for complete score records.

<a id="decision-37"></a>

## 37. Summary generation and deployment boundary

- Finalize score archives and catalog chart links before generating chart summaries.
- Generate summaries once, validate them, and include them in the same `Add new score data` commit as score and catalog changes.
- Deployment consumes the committed snapshot and must not generate, rewrite, or commit summaries.
- This corrects the earlier failure mode where summary changes existed only in an ephemeral deploy workspace and never reached the repository.
- New deployments must invalidate versioned frontend/PWA caches so the newly committed data becomes visible without retaining a stale application shell.

<a id="decision-38"></a>

## 38. Frontend catalog, summary, and history ownership

- Chart detail pages resolve a relationship entry from the catalog by stable `chartId`. The entry references the original chart, version, and song objects without cloning them. Jacket URLs are derived centrally from the song's `jacketKey`. Cumulative best achievement, combo, and sync come from chart summaries.
- The score list groups eagerly loaded scores by canonical song, but reads per-chart cumulative bests and recency from chart summaries. Removing the eager score import remains future work.
- Derive rank from achievement rather than storing rank independently.
- Load monthly score chunks for detailed play records and judgments; summaries are not the source of full history. History currently shows overall judgments and Fast/Slow counts. Note-type breakdown display and a progression timeline remain unimplemented.
- Best achievement, combo, and sync displayed together are explicitly independent and need not originate from one play.
- The song-jacket element and chart detail page follow this same ownership boundary.
- Long title and artist presentation uses one reusable overflow component: centered while fitting, left-aligned when overflowing, edge-faded, linearly animated with pauses and an invisible reset, and respectful of reduced-motion preferences.

<a id="decision-39"></a>

## 39. Zetaraku as the sole supplemental chart source

- Use Zetaraku's public `arcade-songs` dataset as the only live supplemental source for exact chart constants and charter names.
- Stop contacting Diving-Fish during catalog synchronization, while retaining the provider-neutral `CHART_SUPPLEMENT_METADATA_URL` configuration name.
- Download the dataset once per catalog run and build an in-memory index; do not request metadata once per song or chart.
- Match by normalized title, artist, chart type, and difficulty so duplicate titles can be disambiguated.
- Permit title-only matching only when exactly one candidate exists, accommodating a legitimate upstream entry with missing artist data without guessing among ambiguous songs.
- Ignore UTAGE sheets because UTAGE support remains deferred.
- Accept only explicit `internalLevel` as an exact constant. Never promote display-derived `internalLevelValue` into authoritative metadata.
- Preserve an existing non-null Diving-Fish constant or charter as a last-known fallback when Zetaraku has no exact replacement.
- Allow a newer exact Zetaraku value to update an older supplemental value.
- Apply local overrides last as the final authority.

<a id="decision-40"></a>

## 40. Supplemental-source validation and migration outcome

- Validate the complete supplemental response before mutating generated catalog or score data.
- Fail on an unavailable source, malformed JSON, invalid update timestamp, unexpected object shape, unknown supported chart type/difficulty, invalid exact constant, duplicate artist-qualified chart key, unresolved ambiguity, or suspicious song/chart coverage regression.
- Route these failures through the existing workflow-level Discord failure notification rather than publishing partial metadata.
- Keep `YA･DA･YO [Reborn]` STD Re:MASTER at the documented local override of `14.4` because the supplemental dataset does not expose its exact value.
- The first local migration preserved all 279 songs and 1,237 chart IDs, added 58 constants, updated 10 older exact constants, added 90 charters, updated 5 charters, and lost no existing constants or charters.
- The migration did not unexpectedly change score archives or chart identity, and full data validation passed.

<a id="decision-41"></a>

## 41. Responsive chart-detail information hierarchy

- Treat score history as the primary mobile task and keep it reasonably close to the initial viewport.
- Retain the decorative `SongDetailFrame` on mobile because it already conveys the canonical title, artist, difficulty, level, best achievement, derived rank, combo, and sync in one compact visual.
- Keep the framed jacket compact on mobile and larger on desktop. The current container is 250px below `lg` and capped at `max-w-73` on desktop; exact styling is an implementation detail rather than a permanent architecture constraint.
- Do not place the full primary information card beneath the jacket on mobile or tablet, because it repeats information already visible in the frame and pushes score history too far down the page.
- Show the primary information card only at `lg` and above, where it acts as the right-hand sidebar beside the full-size jacket and horizontal space is available.
- Keep difficulty navigation visible at every breakpoint. Include every difficulty for the current DX or STD song version, display the active difficulty as a disabled color-coded button, and link the remaining difficulties by stable chart ID.
- Use tighter mobile gaps and slightly reduced spacing before Score History, while preserving the more spacious desktop composition.

<a id="decision-42"></a>

## 42. Early duplicate detection by capture timestamp

- Index existing MainInfo scores by `playedAt`, normalized to a UTC ISO instant, at importer startup.
- Treat an exact timestamp match from Google Drive's extracted image metadata as an early duplicate signal and check it before downloading the incoming file.
- If Drive image metadata is unavailable, check the embedded EXIF timestamp immediately after download and before image preparation or OCR.
- Never use Drive file creation time alone for this duplicate shortcut; it represents upload timing rather than capture timing.
- Equivalent timestamp strings with different UTC offsets match when they resolve to the same instant. A one-second difference does not match.
- On a match, write `_ScoreImportLog` status `DUPLICATE`, associate the existing MainInfo row, and record the exact reason `duplicate capture timestamp`.
- Move the incoming file to the duplicates folder, skip score insertion and OCR, and report the import result as `duplicate`.
- Keep source SHA-256 and full score-fingerprint duplicate detection in place as later independent safeguards.
- Duplicate results do not trigger image-review Discord notifications. That notification path remains limited to `rejected` and `imported-move-pending` outcomes.

<a id="decision-43"></a>

## 43. Derived combo status and nullable storage

- Do not ask OCR to parse the combo badge. Combo is absent from both the OCR prompt and strict output schema, reducing unnecessary model work and eliminating badge-classification errors.
- Derive combo from normalized achievement and overall judgment totals using one shared rule:
  - exactly `101%` → `AP+`;
  - zero misses, goods, and greats → `AP`;
  - zero misses and goods → `FC+`;
  - zero misses → `FC`;
  - otherwise → `null`.
- Rank remains independent from combo and is derived dynamically by the frontend from achievement. In particular, an achievement below 80% renders as Failed; Failed is not a stored combo status.
- Store `null` when a play has no FC/AP achievement. The legacy `Clear` combo value is removed from score types, validation, summaries, and frontend rendering.
- Keep Combo Status in the main score spreadsheet. When judgments are available, spreadsheet loading derives and trusts the calculated combo instead of the stored cell; the stored value is only a fallback when judgments are unavailable.
- Score Import Review no longer accepts or requires Corrected Combo Status. The column was removed from the live review sheet, and manual imports derive combo through the same normalization path as OCR-backed imports.
- Chart summaries store `bestCombo: null` when a chart has no FC/AP play. Best achievement and its derived rank remain available independently.
- Historical reconciliation covered all 770 archived scores and the live main sheet: 458 scores now store null, 190 FC, 97 FC+, 20 AP, and 5 AP+. It also corrected ten FC records to FC+, one Clear record to FC+, and one 101% AP record to AP+. The final audit reported zero derivation mismatches.

<a id="decision-45"></a>

## 45. Fixed UTC weekly import schedule

- Run the scheduled import every Monday at 08:00 UTC (`0 8 * * 1`).
- This is Monday 04:00 Eastern during daylight time and 03:00 during standard time; it no longer targets Sunday midnight.
- Remove the dual daylight-saving cron entries and Eastern-time guard. Manual dispatch and the optional image limit remain available.
- This supersedes the schedule in sections 7 and 24. A single UTC schedule avoids maintaining a local-time guard.
- Source: `.github/workflows/import-new-scores.yml`; commit `522a050`.

<a id="decision-46"></a>

## 46. Network-only HTML and stable sharing metadata

- Exclude HTML from service-worker precaching and use `NetworkOnly` for navigation requests, with no cached navigation fallback.
- Continue precaching bundled scripts, styles, fonts, and images; retain the bounded Cache First jacket cache from section 22.
- This reduces stale application-shell behavior, but means offline navigation is not promised.
- Provide static Open Graph metadata for the public gallery and emit the favicon at a stable asset path for the sharing image. Other bundled assets retain hashed filenames.
- Sharing metadata is gallery-wide; chart-specific server-rendered previews are not implemented.
- Sources: `config/vite.config.ts`, `index.html`; commits `a5f03f1`, `a73bb32`.

<a id="decision-47"></a>

## 47. Path routing, deep links, and reading position

- Use pathname routes under Vite's configured repository base path, including `/scores` and `/charts/<chartId>`.
- Reserve the chart URL fragment for a specific score ID so individual history records can be linked. Opening or closing an entry replaces the current history state rather than adding a navigation entry.
- New chart pages start at the top; an explicit score deep link retains smooth scrolling to that record.
- Handle internal navigation through the browser History API while preserving ordinary modified-click, external-link, and download behavior.
- Copy the built entry HTML to `404.html` during Pages deployment so direct nested URLs can load the app. This is a static-host fallback and may still return an HTTP 404 status for a direct nested request.
- Store scroll position in history entries for Back/Forward navigation; preserve the current position when switching chart difficulties.
- Keep score-list query, loaded item count, and scroll position in session storage so returning to the list restores browsing context. Load the list in batches of 30.
- These choices make charts shareable and avoid losing the reader's place while comparing difficulties or browsing history.
- Sources: `src/App.tsx`, `src/utils/navigation.ts`, `src/pages/ScoreListPage.tsx`, `.github/workflows/deploy-pages.yml`; routing commits `ff07425`, `b36e9f4`.

<a id="decision-48"></a>

## 48. Derived chart rating and Top 50 boundary

- Calculate a chart's CiRCLE/CiRCLE PLUS rating contribution from its exact chart constant, achievement, and combo.
- Cap achievement at 100.5%, multiply the constant by the capped achievement fraction and the applicable rank coefficient, floor the result, then add one for AP or AP+.
- Return unavailable when the exact chart constant is unknown; never substitute a displayed level estimate.
- The desktop chart-detail information card uses cumulative best achievement and best combo, which may originate from different plays. This is a derived chart value, distinct from the player's captured overall `rating` and `ratingChange` stored per score.
- Top 50 remains a placeholder with a planned new/old chart-pool split. A chart-rating helper does not constitute a completed B50 calculation or page.
- Sources: `src/utils/rating.ts`, `src/pages/ChartDetailPage.tsx`, `src/pages/Top50Page.tsx`.

<a id="decision-49"></a>

## 49. Fixed OCR request settings

- Keep the model configurable through `OPENAI_OCR_MODEL`.
- Current production options are defined in code: high image detail, low reasoning effort, 5,000 maximum output tokens, a 45-second timeout, and one retry.
- Image detail and output-token options are no longer loaded from environment variables. This supersedes the earlier configuration advice in section 9.
- Send score OCR requests with `store: false`; retain the application's successful OCR cache in the private import log as described in section 20.
- Fixed request options make the active OCR behavior inspectable in one place. No claim about other provider retention policies is implied by `store: false`.
- Source: `scripts/lib/openai-score-ocr.mjs`.

<a id="decision-50"></a>

## 50. Off-minute weekly import schedule

- Move the scheduled import from Monday at 08:00 UTC to 08:22 UTC (`22 8 * * 1`).
- This is Monday 04:22 Eastern during daylight time and 03:22 during standard time.
- GitHub Actions substantially delayed the minute-0 scheduled event on consecutive Mondays. Using minute 22 avoids the higher-load start-of-hour window while retaining the fixed UTC schedule selected in decision 45.
- Manual dispatch and the optional image limit remain unchanged.
- Source: `.github/workflows/import-new-scores.yml`.

<a id="decision-51"></a>

## 51. Song-first expandable score grid

- Replace the former record-oriented score list with one card per canonical song. A card combines the song's recorded charts and, when available, both its DX and STD versions.
- Keep the search vocabulary from section 4: canonical, kana, romaji, English, and legacy aliases remain searchable even though the visual unit is now the grouped song.
- Sort songs by their most recent recorded play, with canonical title as the deterministic tie-breaker. Store `lastPlayedAt` in each chart summary and derive the song's recency from the latest chart value rather than scanning history for sorting alone.
- Use chart summaries for the compact per-difficulty achievement, combo, and sync display. Detailed score history still belongs on the chart page, and the frontend still eagerly imports monthly scores to discover recorded songs; the lazy-loading work deferred in section 35 is therefore not complete.
- Open a song inline from its jacket, showing its difficulty rows and a DX/STD switch where both versions exist. Preserve the existing paginated search state and browsing position when the user follows a chart link and later returns.

### Expansion behavior and iterations

- The first redesign expanded a selected card within the responsive grid and animated the affected layout. This exposed competing goals: keep the selected jacket visually continuous, keep nearby cards understandable, and avoid surprising document jumps.
- An early implementation moved the selected card to the start of its row before expansion. That reordering was removed because clicking a card should not change the list's logical or visual order.
- The next stable-order implementation initially allowed neighboring cards to move around the expanded card. It was revised to leave the other cards in the selected row in place, using placeholders and animated layout changes for later rows.
- Jacket growth and card movement use one coordinated transition. Interaction is temporarily blocked during the transition so wheel, touch, keyboard, or repeated clicks cannot leave the grid between layout states.
- On viewports below `md`, always expand downward. This keeps mobile behavior predictable and avoids inserting expanded content above the jacket the user just selected.
- Autoscrolling was first added for the intermediate `md`-to-`lg` layout and then generalized to every viewport below `lg`, keeping the selected card usefully framed after expansion. At `lg` and above, the denser grid can choose the expansion direction based on available viewport space without forced autoscrolling.
- Opening a different song collapses the previous card as part of the same coordinated transition. Searching collapses the open card so a stale expansion cannot remain attached to a filtered result set.
- These rules are behavioral decisions; exact durations, easing, spacing, and card dimensions remain implementation details.
- Sources: `src/pages/ScoreListPage.tsx`, `src/components/song/SongGrid.tsx`, `src/components/song/ExpandedSongDetails.tsx`, `src/hooks/useExpandableSongGrid.ts`, `src/hooks/usePersistentPaginatedList.ts`, `src/utils/song-summaries.ts`; commits `d68a5b8`, `b9ff585`, `1a6804a`, `ca74606`, `16ec14e`, `ad63769`, `e9071e2`, `6cdc7d0`.

<a id="decision-52"></a>

## 52. Direct DX/STD navigation for matching charts

- Treat DX and STD versions connected by the catalog's stable parent song identity as alternate versions of the same logical song, rather than matching them only by display title.
- On a chart detail page, offer a direct Standard/Deluxe link only when the alternate version contains the same difficulty.
- Preserve the current scroll position when using this version switch, matching the difficulty-navigation behavior in section 47 so comparison does not return the reader to the top of the page.
- The song card uses the same catalog relationship for its inline DX/STD switch, keeping list and detail navigation consistent.
- Do not guess a fallback difficulty when there is no exact counterpart; omit the version link instead.
- Sources: `src/utils/catalog.ts`, `src/pages/ChartDetailPage.tsx`, `src/utils/song-summaries.ts`, `src/components/song/ExpandedSongDetails.tsx`; commit `86d3458`.

<a id="decision-53"></a>

## 53. Canonical catalog objects and centralized song jackets

- Keep the parsed `Song`, `SongVersion`, and `Chart` instances as the only catalog domain objects in browser memory. Do not hydrate them into copied frontend variants or maintain parallel stored/catalog interfaces.
- Keep the persisted JSON hierarchy unchanged: a song owns its versions, and a version owns its charts. Do not add circular parent references to the stored shapes.
- Build lookup indexes that return lightweight relationship results referencing the canonical objects. `SongCatalogEntry` contains the matched song and version; `ChartCatalogEntry` adds the chart.
- Treat these entries like joined query results rather than additional domain entities. They let chart views access `chart`, `version`, and `song` together while preserving a single source object for each.
- Store only `Song.jacketKey` in the catalog and construct the public URL exclusively through the shared `jacketUrl(song)` helper. Do not copy derived jacket URLs into charts, summaries, or catalog-specific song objects.
- Pass catalog relationship entries into chart-detail UI so the song needed for its jacket and shared metadata is available without separately passing or duplicating it.
- Sources: `src/utils/types.ts`, `src/utils/catalog.ts`, `src/utils/jackets.ts`, `src/utils/song-summaries.ts`, `src/components/song/SongJacketImage.tsx`, `src/pages/ChartDetailPage.tsx`.

<a id="decision-54"></a>

## 54. Initial multi-select song filters

- Filter the song-first score list by combo status, sync status, genre, difficulty, and level. Each menu accepts multiple values.
- Add Played only as a separate, independent toggle.
- Reverse combo and sync choices so stronger statuses appear first. List levels in descending numeric order, including plus levels.
- Sources: `src/components/song/SongFilterPanel.tsx`, `src/utils/score-list.ts`.

<a id="decision-55"></a>

## 55. Refine filters around a matching chart subset

- Treat genre as a song condition and the remaining choices as chart conditions. All active chart conditions must be satisfied by the same chart; unrelated charts from one song cannot collectively satisfy a filter combination.
- Represent an unavailable combo or sync status as `null` and label only that value “None.” Do not introduce a display-only string sentinel into filter state.
- Replace the independent Played only toggle with a contextual filter shown only when difficulty or level has selected a chart subset where played state is useful.
- Automatically clear Played only when the final difficulty and level selections are removed, preventing an active condition from becoming invisible.
- Count every selected value plus Played only once. `SongFilterPanel` owns this total and reports it to the Filters button; Clear filters does not repeat the count.
- Sources: `src/components/song/SongFilterPanel.tsx`, `src/components/song/SongListControls.tsx`, `src/utils/score-list.ts`.

<a id="decision-56"></a>

## 56. Initial broad sorting model

- Initial candidates included most/least recently played, English and Japanese title order, difficulty, level, best achievement, play count, and player-rating contribution.
- Use one separate direction button for ascending/descending behavior instead of duplicating direction-specific options. The direction applies to the selected criterion and its numeric tie-breaker.
- Give the sort selector a fixed width and use the shared arrow visual for its chevron and direction button.
- Sources: `src/components/song/SongSortControls.tsx`, `src/utils/score-list.ts`.

<a id="decision-57"></a>

## 57. Narrow sort criteria and define tie-breakers

- The final criteria are recently played, English title order, Japanese title order, level, best achievement, and play count.
- Remove difficulty sorting after retaining difficulty as a filter. Remove player-rating-contribution sorting while keeping chart rating available elsewhere in the application.
- Break level and play-count ties with best achievement. Break achievement ties with level.
- Compare level with an exact chart constant when available. Otherwise use the displayed whole-number level with `+` ranked above the equivalent plain level.
- Resolve remaining ties by canonical title so output is deterministic.
- English title order prefers English, then romaji, then canonical title. Japanese title order prefers kana, then canonical title.
- The selector options are the runtime source of valid persisted sort values; validation does not maintain a parallel list.
- Sources: `src/components/song/SongSortControls.tsx`, `src/utils/score-list.ts`, `src/hooks/useSongListState.ts`.

<a id="decision-58"></a>

## 58. Filter first, derive sort metrics second, sort last

- An early question was whether active filters should influence sorting. The final answer is yes: sorting describes only the chart subset that matched the filters.
- Process the list in three explicit phases: retain each song's matching charts, calculate song-level metrics once from those charts, then sort by the cached metrics.
- This prevents an unmatched BASIC play from influencing recent-play or play-count sorting while the list is filtered to MASTER, for example.
- Calculate maximum level, maximum achievement, total play count, and most-recent play time from the matching subset. Calculate the applicable English and Japanese title keys once in the same metric phase.
- Keep raw facts in catalog and chart-summary data, but do not store these filtered aggregates there. Their values depend on transient UI filters and are therefore list-view projections.
- Computing metrics once per filtered song also avoids repeating reductions during each invocation of the JavaScript sort comparator.
- Sources: `src/utils/score-list.ts`, `src/utils/song-summaries.ts`, `src/utils/types.ts`.

<a id="decision-59"></a>

## 59. Precomputed multilingual song search

- Search canonical, kana, romaji, English, and legacy alias titles with partial, case-insensitive matching.
- Build `SongSummary.searchText` once while grouping frontend song summaries, before chart summarization in the same phase. Join all title forms and lowercase the result.
- Trim and lowercase each query, then perform a direct substring check against the cached search string. Do not repeatedly join and normalize every song's title arrays on each keystroke.
- Keep the search string out of `song-catalog.json`. It is cheap derived frontend data, duplicates existing catalog fields, and would otherwise couple the persisted catalog schema to one search implementation.
- Extract search into `SongSearchInput` with an SVG search icon and an explicit X action that clears persisted query state.
- A measured custom placeholder with three literal periods was explored because the browser ellipsis glyph appeared vertically centered. The overlay introduced visual/background and overlap complexity and was removed; the final control uses its native placeholder.
- Sources: `src/components/song/SongSearchInput.tsx`, `src/utils/song-titles.ts`, `src/utils/song-summaries.ts`, `src/pages/ScoreListPage.tsx`.

<a id="decision-60"></a>

## 60. Persistent controls separate from pagination state

- `useSongListState` owns and session-persistently stores query, filters, sort criterion, and sort direction.
- Keep pagination's visible count and scroll position in a separate storage record. The pagination hook accepts a controlled query rather than owning a competing query state.
- Any query, filter, sort, or direction change resets visible pagination and collapses the expanded song so stale list position or inline detail does not remain attached to changed results.
- Explicit Search X and Clear filters actions must write the empty values to storage, not only clear their visible components. Reload and navigation-back behavior were manually verified for both paths.
- Validate restored combo, sync, and difficulty choices against their runtime domain values. Accept `null` for missing combo/sync; obsolete local-only sentinel values require no compatibility branch.
- Sources: `src/hooks/useSongListState.ts`, `src/hooks/usePersistentPaginatedList.ts`, `src/pages/ScoreListPage.tsx`.

<a id="decision-61"></a>

## 61. Extract consistent song-list selectors

- Extract the initially separate sorting and filtering menus into dedicated selector components.
- Match their trigger, menu, chevron, sizing, layering, and click-outside behavior even though filtering shows checkmarks and sorting permits one value.
- Constrain menu height, prevent scroll chaining, and layer menus above surrounding controls. Allow left- or right-edge anchoring so wide menus remain inside the layout.
- Centralize outside/Escape behavior in `useOutsideDismissal`, with one document listener pair and registered elements rather than independent global listeners for every selector.
- Move filter, search, and sort-direction artwork into the shared icon assets. Replace one-off chevrons with a directional, stylable `ChevronIcon` shared with related score UI.
- Sources: `src/components/ui/DropdownSelector.tsx`, `src/components/ui/ChevronIcon.tsx`, `src/hooks/useOutsideDismissal.ts`, `src/assets/icons`.

<a id="decision-62"></a>

## 62. Consolidate selectors into one generic dropdown

- Replace the parallel selectors with `DropdownSelector`, a generic UI component whose `allowMultiple` option controls checkbox and selection behavior.
- Keep single- and multi-select triggers and menus visually identical. Close a single-select menu after selection; keep a multi-select menu open until dismissal.
- Let menus grow only as wide as their content requires while remaining at least as wide as their trigger; retain a fixed-width sort trigger.
- Sources: `src/components/ui/DropdownSelector.tsx`, `src/components/song/SongFilterPanel.tsx`, `src/components/song/SongSortControls.tsx`.

<a id="decision-63"></a>

## 63. Introduce and stabilize the collapsible filter row

- Move filters from the primary controls row into a separate panel opened by a Filters button. Animate the panel from zero grid-row height to its content height.
- Hide overflow while the height transition runs, then allow visible overflow so an open dropdown is not clipped by the panel.
- An attempt to unmount the panel after collapse removed an empty grid track but made the animation ending feel unstable. Remove that mount lifecycle; the final panel remains mounted and transitions directly between row sizes.
- Attempts to eliminate reserved grid space altered the animation and were reverted; final spacing is controlled by the panel's own margins.
- Sources: `src/styles.css`, `src/components/song/SongListControls.tsx`, `src/components/song/SongFilterPanel.tsx`.

<a id="decision-64"></a>

## 64. Finalize responsive song-list control layout

- Group search with the Filters button and group sorting with its direction button. Keep a wider separation between those groups on desktop and prevent a filter-count change from shrinking the search input unexpectedly.
- Keep sorting content-sized and right-aligned. When horizontal space is insufficient, order controls as search/filter, filter panel, then sorting so expanded filters remain adjacent to their button.
- Centralize the former repeated 830px media query as the `song-controls-wide` Tailwind variant. At that breakpoint, controls use two columns and the filter panel spans below them.
- Let the wide-layout search field prefer 400px and shrink to 330px before changing to the stacked layout. Below the breakpoint, search/filter fill their row and sorting remains right-aligned.
- Let song-grid jacket columns shrink to 120px before dropping a column. Expand lower-viewport cards upward sooner than a symmetrical halfway split to reduce avoidable scrolling.
- Exact margins, gaps, and icon padding were tuned iteratively after the structural decisions; they remain presentation details rather than data contracts.
- Sources: `src/styles.css`, `src/components/song/SongListControls.tsx`, `src/components/song/SongFilterPanel.tsx`, `src/components/song/SongSearchInput.tsx`, `src/components/song/SongSortControls.tsx`, `src/css/components/song-grid.css`, `src/hooks/useExpandableSongGrid.ts`.

<a id="decision-65"></a>

## 65. Focused control components and shared runtime values

- Extract `SongListControls`, search, filtering, and sorting from `ScoreListPage`; keep the page responsible for data flow and list rendering rather than control markup.
- Further split the coordinator into `SongSearchInput`, `SongFilterPanel`, and `SongSortControls`. The filter panel owns its derived active count and reports it upward for the Filters button.
- Define combo statuses, sync statuses, and difficulties as runtime constant tuples and derive their TypeScript union types from those tuples. Reuse the same values for filter options and data validation.
- Reuse the shared difficulty tuple when ordering summarized charts rather than maintaining another difficulty list in `song-summaries.ts`.
- Define static filter and sort options at module scope. Memoize genre and level option objects because those collections are derived from song data.
- Keep `score-list.ts` focused on pure filter, metric, and sorting functions so behavior can be tested without rendering React components.
- Focused tests use one assertion per example and cover same-chart matching, contextual Played only, option order, matching-subset sorting, directions, tie-breakers, null status, and normalized search.
- Sources: `src/components/song`, `src/utils/score-list.ts`, `src/utils/types.ts`, `src/utils/data-validation.ts`, `src/utils/song-summaries.ts`, `test/utils/score-list.test.mjs`, `test/utils/song-titles.test.mjs`.
