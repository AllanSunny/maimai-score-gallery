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

Titles that cannot be matched are excluded from the committed score archive and
reported through Discord. Correct image-import failures in the visible
`Score Import Review` sheet and check `Retry`, or add catalog corrections to
`src/data/overrides.json`, then rerun **Import New Scores**. Unmatched names are
retried and are never written to the public catalog.

### GitHub configuration

Under **Settings → Secrets and variables → Actions → Secrets**, add:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `OPENAI_API_KEY`
- `DISCORD_WEBHOOK_URL`

Under **Actions → Variables**, add:

- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_PROCESSED_FOLDER_ID`
- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_SHEET_NAME`

Optionally set `OPENAI_OCR_MODEL`; it defaults to `gpt-5.5`.

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
