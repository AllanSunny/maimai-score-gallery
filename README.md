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

## Catalog and jacket synchronization

The same catalog importer runs locally and in GitHub Actions. It reads recorded
song titles, matches them against SEGA's public catalog, uploads missing jacket
art to Cloudflare R2, merges `catalog/overrides.json`, and writes the tracked
`src/data/generated-catalog.json` file.

### Local setup

In Cloudflare, create an R2 API token with **Object Read & Write** access scoped
only to the jacket bucket. Copy `.env.r2.example` to `.env.r2` and provide the
account ID, R2 access-key pair, bucket name, public bucket URL, and public Apps
Script score-feed URL. `.env.r2` is ignored by Git.

```bash
npm install
npm run catalog:sample
npm run catalog:sync
```

`catalog:sample` synchronizes only `系ぎて` (Tsunagite). `catalog:sync` reads all
recorded titles from `SCORES_API_URL`.

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

Run **Sync song catalog** from the Actions tab and enable the Tsunagite sample
checkbox for the first test. The scheduled run executes every Sunday at
midnight Eastern time, synchronizes all recorded songs, and commits catalog
changes back to `main`.
