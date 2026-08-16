import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedScoreImage, processedImageName } from "../../../scripts/lib/drive-images.mjs";

test("Drive image filtering accepts image MIME types and HEIC fallbacks", () => {
  assert.equal(isSupportedScoreImage({ mimeType: "image/jpeg", name: "score" }), true);
  assert.equal(isSupportedScoreImage({ mimeType: "application/octet-stream", name: "score.HEIC" }), true);
  assert.equal(isSupportedScoreImage({ mimeType: "text/plain", name: "notes.txt" }), false);
});

test("Drive image filtering rejects unsupported image project formats", () => {
  assert.equal(isSupportedScoreImage({ mimeType: "image/x-xcf", name: "template.xcf" }), false);
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

test("processed filenames preserve canonical full-width song-title symbols", () => {
  assert.equal(
    processedImageName({
      canonicalTitle: "愛♡スクリ～ム！",
      capturedAt: "2026-07-25T05:34:16.000Z",
      originalName: "IMG_4565.HEIC",
    }),
    "愛♡スクリ～ム！ - 2026-07-25T05-34-16Z.heic",
  );
});
