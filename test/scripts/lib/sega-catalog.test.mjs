import assert from "node:assert/strict";
import test from "node:test";
import { createSegaCatalogLoader } from "../../../scripts/lib/sega-catalog.mjs";

test("SEGA catalog loader downloads only once per process", async () => {
  let calls = 0;
  const expected = [{ title: "Song" }];
  const load = createSegaCatalogLoader({
    url: "https://example.test/catalog.json",
    async download(url, label) {
      calls += 1;
      assert.equal(url, "https://example.test/catalog.json");
      assert.equal(label, "SEGA song catalog");
      return expected;
    },
  });

  assert.equal(await load(), expected);
  assert.equal(await load(), expected);
  assert.equal(calls, 1);
});

test("SEGA catalog loader rejects malformed catalog data", async () => {
  const load = createSegaCatalogLoader({
    url: "https://example.test/catalog.json",
    async download() { return {}; },
  });
  await assert.rejects(load(), /must be an array/);
});
