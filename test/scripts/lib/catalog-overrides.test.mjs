import assert from "node:assert/strict";
import test from "node:test";
import { standaloneCatalogSongs } from "../../../scripts/lib/catalog-overrides.mjs";

test("standalone overrides become resolver-compatible catalog songs", () => {
  const songs = standaloneCatalogSongs({
    "Removed Song": {
      standalone: true,
      id: "removed-song",
      artist: "Former Artist",
      jacketKey: null,
      titles: { english: ["archived song"], aliases: ["old song"] },
      charts: {
        "STD:EXPERT": { level: "12", chartConstant: 12.4, charter: "Designer" },
        "STD:MASTER": { level: "13+", chartConstant: null, charter: null },
      },
    },
    "Official Song": { id: "official-song", charts: {} },
  });

  assert.equal(songs.length, 1);
  assert.equal(songs[0].title, "Removed Song");
  assert.equal(songs[0].artist, "Former Artist");
  assert.equal(songs[0].lev_exp, "12");
  assert.equal(songs[0].lev_mas, "13+");
  assert.deepEqual(songs[0].matchTitles, ["Removed Song", "archived song", "old song"]);
});

test("standalone overrides require stable identity, artist, and chart levels", () => {
  assert.throws(() => standaloneCatalogSongs({
    "Removed Song": {
      standalone: true,
      artist: "Artist",
      charts: { "DX:MASTER": { level: "13" } },
    },
  }), /id is required/);
  assert.throws(() => standaloneCatalogSongs({
    "Removed Song": {
      standalone: true,
      id: "removed-song",
      artist: "Artist",
      charts: { "DX:MASTER": {} },
    },
  }), /level is required/);
});
