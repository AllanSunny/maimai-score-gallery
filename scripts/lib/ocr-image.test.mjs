import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  DEFAULT_OCR_IMAGE_OPTIONS,
  isHeicImage,
  ocrImageOptions,
  prepareOcrImage,
} from "./ocr-image.mjs";

test("OCR image settings default to the parity-first values", () => {
  assert.deepEqual(ocrImageOptions({}), DEFAULT_OCR_IMAGE_OPTIONS);
});

test("OCR image settings reject unsafe values", () => {
  assert.throws(
    () => ocrImageOptions({ SCORE_IMAGE_MAX_EDGE: "256" }),
    /SCORE_IMAGE_MAX_EDGE must be an integer from 512 through 8192/,
  );
  assert.throws(
    () => ocrImageOptions({ SCORE_IMAGE_JPEG_QUALITY: "101" }),
    /SCORE_IMAGE_JPEG_QUALITY must be an integer from 1 through 100/,
  );
});

test("HEIC detection accepts MIME types and filename extensions", () => {
  assert.equal(isHeicImage({ mimeType: "image/heic" }), true);
  assert.equal(isHeicImage({ mimeType: "image/heif; charset=binary" }), true);
  assert.equal(isHeicImage({ fileName: "score.HEIC" }), true);
  assert.equal(isHeicImage({ mimeType: "image/jpeg", fileName: "score.jpg" }), false);
});

test("normal iPhone dimensions are preserved without cropping or enlargement", async () => {
  const input = await sharp({
    create: { width: 4032, height: 3024, channels: 3, background: "#205080" },
  }).jpeg().toBuffer();
  const output = await prepareOcrImage(
    { buffer: input, mimeType: "image/jpeg", fileName: "score.jpg" },
    DEFAULT_OCR_IMAGE_OPTIONS,
  );

  assert.equal(output.mimeType, "image/jpeg");
  assert.equal(output.width, 4032);
  assert.equal(output.height, 3024);
});

test("oversized images shrink proportionally to the configured safety cap", async () => {
  const input = await sharp({
    create: { width: 5000, height: 2500, channels: 3, background: "#205080" },
  }).jpeg().toBuffer();
  const output = await prepareOcrImage(
    { buffer: input, mimeType: "image/jpeg", fileName: "score.jpg" },
    DEFAULT_OCR_IMAGE_OPTIONS,
  );

  assert.equal(output.width, 4096);
  assert.equal(output.height, 2048);
});

test("JPEG orientation is applied before dimensions are reported", async () => {
  const input = await sharp({
    create: { width: 120, height: 80, channels: 3, background: "#205080" },
  }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const output = await prepareOcrImage(
    { buffer: input, mimeType: "image/jpeg", fileName: "score.jpg" },
    { maxEdge: 512, jpegQuality: 95 },
  );

  assert.equal(output.width, 80);
  assert.equal(output.height, 120);
});
