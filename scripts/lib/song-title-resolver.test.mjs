import assert from "node:assert/strict";
import test from "node:test";
import { createSongTitleResolver, normalizedSongTitle, SongResolutionError } from "./song-title-resolver.mjs";

const songs = [
  {
    title: "Mystic Parade",
    image_url: "mystic.png",
    dx_lev_bas: "4",
    dx_lev_mas: "13+",
  },
  {
    title: "Magical Flavor",
    image_url: "magical.png",
    dx_lev_mas: "13",
    lev_mas: "12+",
  },
  {
    title: "Magical Flavor Remix",
    image_url: "magical-remix.png",
    dx_lev_mas: "13+",
  },
  {
    title: "熱異常",
    image_url: "netsu.png",
    dx_lev_exp: "12+",
  },
];

function resolver(catalog = songs) {
  return createSongTitleResolver({ async loadCatalog() { return catalog; } });
}

test("song title normalization ignores harmless Unicode and spacing differences", () => {
  assert.equal(normalizedSongTitle(" Ｍｙｓｔｉｃ　Parade "), "mysticparade");
});

test("resolver returns a canonical exact match and authoritative chart level", async () => {
  const result = await resolver().resolve({
    visibleTitle: "Ｍｙｓｔｉｃ Parade",
    titleTruncated: false,
    chartType: "DX",
    difficulty: "MASTER",
  });
  assert.equal(result.canonicalTitle, "Mystic Parade");
  assert.equal(result.matchType, "exact");
  assert.deepEqual(result.chart, { chartType: "DX", difficulty: "MASTER", level: "13+" });
});

test("resolver completes one uniquely clipped title", async () => {
  const result = await resolver().resolve({
    visibleTitle: "Mystic Par…",
    titleTruncated: true,
    chartType: "DX",
    difficulty: "BASIC",
  });
  assert.equal(result.canonicalTitle, "Mystic Parade");
  assert.equal(result.matchType, "truncated-prefix");
});

test("resolver completes a unique clipped title containing only the ending", async () => {
  const result = await resolver().resolve({
    visibleTitle: "…Parade",
    titleTruncated: true,
    chartType: "DX",
    difficulty: "BASIC",
  });
  assert.equal(result.canonicalTitle, "Mystic Parade");
  assert.equal(result.matchType, "truncated-suffix");
});

test("resolver never applies edge matching unless OCR marked the title clipped", async () => {
  await assert.rejects(
    resolver().resolve({
      visibleTitle: "Mystic Par",
      titleTruncated: false,
      chartType: "DX",
      difficulty: "BASIC",
    }),
    (error) => error instanceof SongResolutionError && error.code === "UNKNOWN_TITLE",
  );
});

test("resolver rejects ambiguous clipped titles with candidate names", async () => {
  await assert.rejects(
    resolver().resolve({
      visibleTitle: "Magical Fla…",
      titleTruncated: true,
      chartType: "DX",
      difficulty: "MASTER",
    }),
    (error) => error.code === "AMBIGUOUS_TITLE"
      && error.candidates.includes("Magical Flavor")
      && error.candidates.includes("Magical Flavor Remix"),
  );
});

test("resolver distinguishes DX and standard versions of a dual-chart song", async () => {
  const standard = await resolver().resolve({
    visibleTitle: "Magical Flavor",
    titleTruncated: false,
    chartType: "STD",
    difficulty: "MASTER",
  });
  assert.equal(standard.chart.level, "12+");

  const dx = await resolver().resolve({
    visibleTitle: "Magical Flavor",
    titleTruncated: false,
    chartType: "DX",
    difficulty: "MASTER",
  });
  assert.equal(dx.chart.level, "13");
});

test("resolver rejects a chart combination absent from the catalog", async () => {
  await assert.rejects(
    resolver().resolve({
      visibleTitle: "熱異常",
      titleTruncated: false,
      chartType: "STD",
      difficulty: "EXPERT",
    }),
    (error) => error.code === "CHART_NOT_FOUND" && error.canonicalTitle === "熱異常",
  );
});
