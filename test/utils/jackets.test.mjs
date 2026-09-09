import test from "node:test";
import assert from "node:assert/strict";
import { jacketUrl } from "../../src/utils/jackets.ts";

test("builds a jacket URL from the song's stored key", () => {
  const url = jacketUrl({ jacketKey: "jackets/song.webp" }, "https://jackets.example.com");

  assert.equal(url, "https://jackets.example.com/jackets/song.webp");
});

test("returns no jacket URL when the song has no key", () => {
  assert.equal(jacketUrl({ jacketKey: null }, "https://jackets.example.com"), null);
});
