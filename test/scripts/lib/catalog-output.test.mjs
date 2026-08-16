import assert from "node:assert/strict";
import test from "node:test";
import { catalogOutput } from "../../../scripts/lib/catalog-output.mjs";

const song = (canonical, artist = "Artist") => ({
  id: canonical.toLowerCase(),
  titles: { canonical, kana: [], romaji: [], english: [], aliases: [] },
  artist,
  jacketKey: null,
  versions: [],
});

test("preserves the catalog timestamp when final song data is unchanged", () => {
  const previous = { generatedAt: "2026-08-15T00:00:00.000Z", songs: [song("Song")] };
  const result = catalogOutput(previous, structuredClone(previous.songs), "2026-08-16T00:00:00.000Z");
  assert.equal(result.changed, false);
  assert.equal(result.catalog, previous);
  assert.equal(result.catalog.generatedAt, "2026-08-15T00:00:00.000Z");
});

test("updates the catalog timestamp only when final song data differs", () => {
  const previous = { generatedAt: "2026-08-15T00:00:00.000Z", songs: [song("Song")] };
  const result = catalogOutput(previous, [song("Song", "Corrected Artist")], "2026-08-16T00:00:00.000Z");
  assert.equal(result.changed, true);
  assert.equal(result.catalog.generatedAt, "2026-08-16T00:00:00.000Z");
  assert.equal(result.catalog.songs[0].artist, "Corrected Artist");
});

test("sorts real catalog changes deterministically", () => {
  const previous = { generatedAt: "old", songs: [song("Song")] };
  const result = catalogOutput(previous, [song("Zulu"), song("Alpha")], "new");
  assert.deepEqual(result.catalog.songs.map(({ titles }) => titles.canonical), ["Alpha", "Zulu"]);
});
