import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedScoreImage, processedImageName } from "./drive-images.mjs";

test("Drive image filtering accepts image MIME types and HEIC fallbacks", () => {
  assert.equal(isSupportedScoreImage({ mimeType: "image/jpeg", name: "score" }), true);
  assert.equal(isSupportedScoreImage({ mimeType: "application/octet-stream", name: "score.HEIC" }), true);
  assert.equal(isSupportedScoreImage({ mimeType: "text/plain", name: "notes.txt" }), false);
});

test("processed filenames contain a safe title, UTC capture time, and original extension", () => {
  assert.equal(
    processedImageName({
      canonicalTitle: "Link / Slash: test?",
      capturedAt: "2026-08-15T14:35:20.123Z",
      originalName: "IMG_1234.HEIC",
    }),
    "Link Slash test - 2026-08-15T14-35-20Z.heic",
  );
});

test("processed filenames require a valid capture time", () => {
  assert.throws(
    () => processedImageName({ canonicalTitle: "Song", capturedAt: "unknown", originalName: "x.jpg" }),
    /valid capture time/,
  );
});
