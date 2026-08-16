import assert from "node:assert/strict";
import test from "node:test";
import {
  auditReport,
  resolveScoreRow,
  syncAuditDecision,
} from "../../../../scripts/one-off/legacy-sync-status/audit.mjs";
import { scoreFingerprint } from "../../../../scripts/lib/import-fingerprints.mjs";
import {
  SYNC_STATUS_PROMPT,
  syncStatusOcrRequest,
} from "../../../../scripts/one-off/legacy-sync-status/sync-status-ocr.mjs";

test("sync-only OCR inspects the full image with a narrowly scoped schema", () => {
  const request = syncStatusOcrRequest({
    image: { buffer: Buffer.from("full image"), mimeType: "image/jpeg" },
  });
  assert.equal(request.input[0].content[1].detail, "high");
  assert.match(SYNC_STATUS_PROMPT, /lower circular touchscreen/);
  assert.match(SYNC_STATUS_PROMPT, /read only the sync position/);
  assert.deepEqual(request.text.format.schema.properties.positionState.enum, [
    "badge", "empty", "unreadable",
  ]);
  assert.deepEqual(request.text.format.schema.properties.sync.enum, [
    null, "Sync", "FS", "FS+", "FDX", "FDX+",
  ]);
});

test("legacy sync reconciliation applies only conservative changes", () => {
  assert.deepEqual(syncAuditDecision(null, { positionState: "badge", sync: "Sync" }, "Clear"), {
    apply: true, value: "Sync",
  });
  assert.deepEqual(syncAuditDecision("FS", { positionState: "badge", sync: "FDX" }, "FC"), {
    apply: true, value: "FDX",
  });
  assert.deepEqual(syncAuditDecision("FS", { positionState: "empty", sync: null }, "Clear"), {
    apply: true, value: null,
  });
  assert.deepEqual(syncAuditDecision("FS", { positionState: "unreadable", sync: null }, "Clear"), {
    apply: false, value: "FS",
  });
  assert.deepEqual(syncAuditDecision(null, { positionState: "badge", sync: "FS" }, "Clear"), {
    apply: false, value: null,
  });
});

test("final sync updates re-resolve current rows from retained identity fields", () => {
  const score = {
    playedAt: "2025-12-31T22:46:59.000Z",
    songTitle: "Halcyon",
    chartType: "DX",
    difficulty: "MASTER",
    achievement: 97.2244,
  };
  const resolution = resolveScoreRow({
    canonicalTitle: score.songTitle,
    captureTime: score.playedAt,
    scoreFingerprint: scoreFingerprint(score),
    spreadsheetRow: 482,
  }, [{ rowNumber: 480, score }]);
  assert.equal(resolution.error, null);
  assert.equal(resolution.rowNumber, 480);
});

test("incremental audit reports cannot be mistaken for complete apply reports", () => {
  const partial = auditReport({ mode: "preview", candidateCount: 2, results: [{
    detected: "Sync", shouldUpdate: true, status: "update-recommended",
  }] });
  assert.equal(partial.complete, false);
  assert.equal(partial.completedCount, 1);
  assert.equal(partial.recommendedUpdateCount, 1);
});
