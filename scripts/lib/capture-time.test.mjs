import assert from "node:assert/strict";
import test from "node:test";
import { selectCaptureTime } from "./capture-time.mjs";

test("capture time prioritizes EXIF and respects its explicit offset", () => {
  const result = selectCaptureTime({
    embedded: { capturedAt: "2026:08:15 12:35:20", offset: "-04:00" },
    driveFile: {
      imageMediaMetadata: { time: "2026-08-16T12:00:00Z" },
      createdTime: "2026-08-17T12:00:00Z",
    },
    timeZone: "America/New_York",
  });
  assert.equal(result.capturedAt, "2026-08-15T16:35:20.000Z");
  assert.equal(result.source, "exif");
});

test("capture time interprets offset-free EXIF in the configured timezone", () => {
  const result = selectCaptureTime({
    embedded: { capturedAt: "2026:08:15 12:35:20" },
    driveFile: {},
    timeZone: "America/New_York",
  });
  assert.equal(result.capturedAt, "2026-08-15T16:35:20.000Z");
  assert.equal(result.source, "exif");
});

test("capture time falls back from EXIF to Drive image metadata", () => {
  const result = selectCaptureTime({
    embedded: {},
    driveFile: {
      imageMediaMetadata: { time: "2026-08-16T12:00:00Z" },
      createdTime: "2026-08-17T12:00:00Z",
    },
    timeZone: "America/New_York",
  });
  assert.equal(result.capturedAt, "2026-08-16T12:00:00.000Z");
  assert.equal(result.source, "drive-image-metadata");
});

test("Drive EXIF-style metadata without an offset defaults to Eastern time", () => {
  const result = selectCaptureTime({
    embedded: {},
    driveFile: { imageMediaMetadata: { time: "2026:07:25 01:34:16" } },
    timeZone: "America/New_York",
  });
  assert.equal(result.capturedAt, "2026-07-25T05:34:16.000Z");
  assert.equal(result.source, "drive-image-metadata");
});

test("capture time uses Drive creation time only after other metadata is absent", () => {
  const result = selectCaptureTime({
    embedded: {},
    driveFile: { createdTime: "2026-08-17T12:00:00Z" },
    timeZone: "America/New_York",
  });
  assert.equal(result.capturedAt, "2026-08-17T12:00:00.000Z");
  assert.equal(result.source, "drive-created-time");
});

test("capture time fails when every source is unavailable", () => {
  assert.throws(
    () => selectCaptureTime({ embedded: {}, driveFile: {}, timeZone: "America/New_York" }),
    /Capture time is unavailable/,
  );
});
