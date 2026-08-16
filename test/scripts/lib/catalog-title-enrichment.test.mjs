import assert from "node:assert/strict";
import test from "node:test";
import { enrichMissingSongTitles } from "../../../scripts/lib/catalog-title-enrichment.mjs";

function song(canonical, titles = {}) {
  return {
    artist: "Test Artist",
    titles: {
      canonical,
      kana: titles.kana ?? [],
      romaji: titles.romaji ?? [],
      english: titles.english ?? [],
      aliases: titles.aliases ?? [],
    },
  };
}

test("title enrichment backfills kana, wapuro romaji, and English without replacing aliases", async () => {
  const songs = [song("ローリンガール", { aliases: ["rollingirl"] })];
  const client = {
    responses: {
      async create() {
        return {
          output_text: JSON.stringify({
            songs: [{
              canonical: "ローリンガール",
              kanaReading: "ろうりん がある",
              englishTitles: ["Rolling Girl"],
            }],
          }),
        };
      },
    },
  };

  assert.equal(await enrichMissingSongTitles(songs, {
    client,
    options: { model: "test", maxOutputTokens: 5000, reasoningEffort: "low" },
  }), 1);
  assert.deepEqual(songs[0].titles, {
    canonical: "ローリンガール",
    kana: ["ろうりん がある"],
      romaji: ["rourin gaaru"],
    english: ["rolling girl"],
    aliases: ["rollingirl"],
  });
});

test("title enrichment skips Latin titles and complete Japanese titles", async () => {
  const songs = [
    song("Mystic Parade"),
    song("熱異常", { kana: ["ねつ いじょう"], romaji: ["netsu ijou"] }),
  ];
  const client = { responses: { create: () => assert.fail("OpenAI should not be called") } };
  assert.equal(await enrichMissingSongTitles(songs, { client }), 0);
});
