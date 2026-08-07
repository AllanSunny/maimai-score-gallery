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

## Score archive, catalog, and jacket synchronization

See [docs/data-model.md](docs/data-model.md) for the centralized reference for
stored score, song-version, chart, jacket, and unmatched-title structures.

The same importers run locally and in GitHub Actions. The score importer appends
new spreadsheet rows to `src/data/generated-scores.json`. The catalog importer
then processes only song titles not already in `src/data/generated-catalog.json`,
matches them against SEGA's public catalog, uploads their jackets to Cloudflare
R2, and merges `catalog/overrides.json`.

### Local setup

In Cloudflare, create an R2 API token with **Object Read & Write** access scoped
only to the jacket bucket. Copy `.env.r2.example` to `.env.r2` and provide the
account ID, R2 access-key pair, bucket name, and public Apps Script score-feed
URL. `.env.r2` is ignored by Git.

```bash
npm install
npm run scores:sync
npm run catalog:sample
npm run catalog:sync
```

`scores:sync` archives plays not already stored. `catalog:sample` synchronizes
only `系ぎて` (Tsunagite). `catalog:sync` reads titles from the score archive and
downloads metadata only for songs not already cataloged.

Titles that cannot be matched are recorded in `generated-catalog.json` under
`unmatchedSongs` with their first-seen time, last attempt, and error reason.
They are skipped on later runs. To retry one, add it to the correct song's
`alternateTitles` in `catalog/overrides.json`; the next sync will detect that
override and try the match again.

Songs can be imported before a score exists by adding their exact title to
`catalog/seed-titles.json`. Seeded songs use the same incremental metadata and
jacket workflow as titles discovered in the score archive.

To inspect generated metadata without uploading a jacket:

```bash
npm run catalog:sample -- --dry-run
```

### GitHub configuration

Under **Settings → Secrets and variables → Actions → Secrets**, add:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Under **Actions → Variables**, add:

- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `SCORES_API_URL`

Generated catalog metadata stores only each jacket's R2 object key. The public
R2 base URL is supplied to Vite at deployment time through `R2_PUBLIC_URL`;
R2 credentials are available only to the metadata workflow.

Run **Archive spreadsheet scores** from the Actions tab for a real-data test.
It runs every Sunday at midnight Eastern time and automatically starts **Sync
new song metadata** when it finishes. That workflow processes only net-new
songs, commits the score archive and catalog together as `Add new score data`,
then **Deploy to GitHub Pages** publishes the completed archive.
