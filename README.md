# maimai-score-gallery
I really like rhythm games and maimai is my latest obsession. There are many beautiful fan-created services out there that help you with score tracking, but those tend to focus on the high points. I wanted to have a place where I could reminisce about my progression through various charts in the game.

## Local development

```bash
npm install
npm run dev
```

## Tailwind components

The project uses Tailwind CSS v4 through the official Vite plugin. It does not
need a `tailwind.config.js`. Project design tokens live in the `@theme` block
at the top of `src/styles.css`; for example, `--color-coral` creates utilities
such as `bg-coral`, `text-coral`, and `border-coral`.

Put reusable React components in `src/components/ui`. `StatCard.tsx` is an
example that accepts a `className` prop, allowing callers to extend it:

```tsx
<StatCard label="AP charts" className="bg-white/80">
  12
</StatCard>
```

Use utilities directly for one-off layouts. Extract a component when the same
visual pattern appears more than once.

## Asset caching

The production build generates a service worker with `vite-plugin-pwa`.
Vite-built JavaScript, CSS, fonts, frames, and icons are precached and updated
automatically when their content hashes change. Jacket images use a separate
Cache First runtime cache scoped to `VITE_JACKET_BASE_URL`, limited to 300
images and 90 days; browser quota pressure may evict entries sooner. Service
workers are not enabled by the normal Vite development server.

## Score archive, catalog, and jacket synchronization

See [docs/data-model.md](docs/data-model.md) for the centralized reference for
stored score, song-version, chart, jacket, and unmatched-title structures.

The **Import New Scores** GitHub workflow processes incoming Drive images, writes
accepted plays to Google Sheets, archives the sheet in
`src/data/generated-scores.json`, and then imports metadata only for songs not
already present in `src/data/generated-catalog.json`. New jackets are uploaded
to Cloudflare R2 and manual corrections come from `src/data/overrides.json`.

### Local setup

In Cloudflare, create an R2 API token with **Object Read & Write** access scoped
only to the jacket bucket. Copy `.env.example` to `.env.local` and provide the
account ID, R2 access-key pair, bucket name, Google API settings, OpenAI key,
and `VITE_JACKET_BASE_URL`. The jacket URL should match GitHub's
`R2_PUBLIC_URL` Actions variable. `.env.local` is ignored by Git.

```bash
npm install
npm run scores:import -- --limit 1
npm run scores:sync
npm run catalog:sync
```

`scores:import` is a live import, not a dry run: it can call OpenAI and modify
Drive and Sheets. `scores:sync` archives plays not already stored.
`catalog:sync` reads titles from the score archive and downloads metadata only
for songs not already cataloged.

Without `--limit`, the image importer processes the full actionable queue
sequentially. Use `--limit 1` only when testing a local or manual run.

Titles that cannot be matched are excluded from the committed score archive and
reported through Discord. Correct image-import failures in the visible
`Score Import Review` sheet and check `Retry`, or add catalog corrections to
`src/data/overrides.json`, then rerun **Import New Scores**. Judgment correction
columns override only the populated overall or note-type counts; blank cells
continue using OCR. Unmatched names are retried and are never written to the
public catalog.

The review sheet can also serve as a manual score entry for a queued image.
Provide a corrected title, chart type, difficulty, achievement, combo, sync,
rating, and the Perfect/Great/Good/Miss totals, then check `Retry`. Rating
change, FAST, and SLOW default to zero when blank; Critical Perfect falls back
to Perfect. A fully populated manual entry bypasses OpenAI. Note-type judgment
corrections are optional as a group and remain unavailable when omitted.

### GitHub configuration

The live repository uses the following **Actions secrets**:

| Secret | Purpose |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service-account credentials for Drive and Sheets |
| `OPENAI_API_KEY` | Score OCR and missing-title enrichment |
| `DISCORD_WEBHOOK_URL` | Review and workflow-failure notifications |
| `R2_ACCOUNT_ID` | Cloudflare account containing the jacket bucket |
| `R2_ACCESS_KEY_ID` | Jacket-bucket write credential |
| `R2_SECRET_ACCESS_KEY` | Jacket-bucket write credential |

The live repository uses the following **Actions variables**:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_DRIVE_FOLDER_ID` | Incoming score-image folder |
| `GOOGLE_PROCESSED_FOLDER_ID` | Destination for successfully imported images |
| `GOOGLE_DUPLICATES_FOLDER_ID` | Destination for duplicate images that can be reviewed and deleted |
| `GOOGLE_SPREADSHEET_ID` | Score workbook and import-review workbook |
| `GOOGLE_SHEET_NAME` | Main score sheet, currently `MainInfo` |
| `OPENAI_OCR_MODEL` | Model shared by score OCR and title enrichment |
| `SCORE_CAPTURE_TIME_ZONE` | Zone used only for capture timestamps that lack an explicit offset |
| `SEGA_CATALOG_URL` | Authoritative SEGA song catalog endpoint |
| `SEGA_JACKET_BASE_URL` | Base URL for authoritative SEGA jacket images |
| `CHART_SUPPLEMENT_METADATA_URL` | Supplemental chart constants and charter names |
| `R2_BUCKET_NAME` | Jacket object-storage bucket |
| `R2_PUBLIC_URL` | Public jacket Worker base URL used by the frontend build |

These names are intentionally explicit and required; the workflows do not
silently substitute endpoint, model, or timezone values.

Generated catalog metadata stores only each jacket's R2 object key. The public
R2 base URL is supplied to Vite at deployment time through `R2_PUBLIC_URL`;
R2 credentials are available only to the metadata workflow.

Run **Import New Scores** from the Actions tab for a real-data import. It also runs
every Sunday at midnight Eastern time. Its job graph imports images, archives
the spreadsheet, syncs only net-new song metadata, validates the result, and
creates at most one `Add new score data` commit. That commit triggers **Deploy
to GitHub Pages**. Image-level review failures are sent to Discord without
blocking accepted scores; infrastructure failures stop downstream jobs and send
a separate failure notification.
